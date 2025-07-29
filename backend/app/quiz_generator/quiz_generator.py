import uuid
import logging
from typing import List, Dict, Any, Tuple
from app.quiz_generator.models import *
from app.document_upload.embedding_generator import EmbeddingGenerator
import google.generativeai as genai
from app.core.config import settings
import json
from sqlalchemy.orm import Session
import re

logger = logging.getLogger(__name__)

class ExamGenerator:
    """Generates exam questions based on provided context."""
    def __init__(self):
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
            self.embedding_generator = EmbeddingGenerator(model_name="models/embedding-001", task_type="RETRIEVAL_QUERY")
        except Exception as e:
            logger.error(f"Error initializing ExamGenerator: {str(e)}")
            raise

    def generate_questions(self, context: str, num_questions: int, question_type: str,difficulty : str) -> List[Dict[str, Any]]:
        """Generates a list of unique questions based on context."""
        try:
            # Map underscore inputs to camel case for compatibility
            question_type_map = {
                "multiple_choice": "MultipleChoice",
                "short_answer": "ShortAnswer",
                "true_false": "TrueFalse",
                "multiplechoice": "MultipleChoice",
                "shortanswer": "ShortAnswer",
                "truefalse": "TrueFalse"
            }
            normalized_type = question_type_map.get(question_type.lower())
            if not normalized_type:
                raise ValueError(f"Unsupported question type: {question_type}")

            prompt = self._build_prompt(context, num_questions, normalized_type,difficulty)
            response = self.model.generate_content(prompt)
            if not response or not hasattr(response, 'text') or not response.text:
                logger.error(f"Invalid Gemini API response: {response}")
                raise ValueError("No valid response from Gemini API")

            logger.debug(f"Gemini API response: {response.text[:500]}")
            questions = self._parse_questions(response.text, normalized_type)
            unique_questions = self._deduplicate_questions(questions, num_questions, normalized_type)
            return unique_questions
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            raise Exception(f"Error generating questions: {str(e)}")

    def _build_prompt(self, context: str, num_questions: int, question_type: str, difficulty:str) -> str:
        """Builds a prompt for Gemini API to generate questions."""
        question_type_description = {
            "MultipleChoice": "multiple-choice questions with 4 options, specifying the correct option index (0-3)",
            "ShortAnswer": "short-answer questions",
            "TrueFalse": "true/false questions"
        }
        return f"""
        You are an expert educator tasked with creating quiz questions. Based on the following context, generate {num_questions} unique {question_type_description[question_type]}:
        {context}
        
        For each question, provide:
        - question: The question text
        - type: "{question_type}"
        - options: For MultipleChoice, a list of 4 distinct options; null for others
        - difficulty: "Easy", "Medium", or "Hard"
        - marks: Integer between 1 and 5
        - hints: List of 1-2 hints
        - explanation: Brief explanation of the correct answer
        - correct_answer: For MultipleChoice, the option index (e.g., "0"); for others, the answer text
        
        The average difficulty of all the questions should be {difficulty}
        Ensure questions and options (for MultipleChoice) are semantically distinct to avoid paraphrasing or similar meanings. Return the output as a valid JSON array, wrapped in triple backticks:
        ```json
        [
            {{
                "question": "Question text",
                "type": "{question_type}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "difficulty": "Easy|Medium|Hard",
                "marks": integer,
                "hints": ["Hint 1", "Hint 2"],
                "explanation": "Explanation text",
                "correct_answer": "0"
            }}
        ]
        ```
        """

    def _parse_questions(self, response_text: str, question_type: str) -> List[Dict[str, Any]]:
        """Parses Gemini API response into a list of questions."""
        try:
            json_start = response_text.find('```json')
            json_end = response_text.rfind('```')
            if json_start != -1 and json_end != -1:
                response_text = response_text[json_start + 7:json_end].strip()
            else:
                logger.warning("No JSON markdown wrapper found in response")

            if not response_text:
                logger.error("Empty response text after processing")
                raise ValueError("Empty response text")

            # --- PATCH: Remove unescaped control characters ---
            # This replaces unescaped control characters (except for \n, \r, \t) with a space
            response_text = re.sub(r'(?<!\\)[\x00-\x1F]', ' ', response_text)
            # --------------------------------------------------

            questions = json.loads(response_text)
            if not isinstance(questions, list):
                logger.error(f"Response is not a JSON array: {response_text[:500]}")
                raise ValueError("Response is not a JSON array")

            parsed_questions = []
            for q in questions:
                question_id = str(uuid.uuid4())
                parsed = {
                    "question_id": question_id,
                    "question": q.get("question", ""),
                    "type": q.get("type", question_type),
                    "difficulty": q.get("difficulty", "Easy"),
                    "marks": q.get("marks", 1),
                    "hints": q.get("hints", []),
                    "explanation": q.get("explanation", ""),
                    "correct_answer": q.get("correct_answer", "")
                }
                if question_type == "MultipleChoice":
                    parsed["options"] = q.get("options", [])
                    if len(parsed["options"]) != 4 or not parsed["correct_answer"].isdigit() or not (0 <= int(parsed["correct_answer"]) < 4):
                        logger.warning(f"Skipping invalid MCQ: {parsed}")
                        continue
                else:
                    parsed["options"] = []
                if not parsed["question"]:
                    logger.warning(f"Skipping question with empty text: {parsed}")
                    continue
                parsed_questions.append(parsed)
            if not parsed_questions:
                logger.error("No valid questions parsed from response")
                raise ValueError("No valid questions parsed")
            return parsed_questions
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}, response: {response_text[:500]}")
            raise Exception(f"Error parsing questions: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing questions: {str(e)}")
            raise Exception(f"Error parsing questions: {str(e)}")

    def _deduplicate_questions(self, questions: List[Dict[str, Any]], num_questions: int, question_type: str) -> List[Dict[str, Any]]:
        """Ensures questions are semantically unique by comparing question and option embeddings."""
        try:
            seen_question_embeddings = []
            seen_option_embeddings = []
            unique_questions = []
            for q in questions:
                question_text = q["question"]
                question_embedding = self.embedding_generator.get_embedding(question_text)
                is_unique = True

                for seen_q_emb in seen_question_embeddings:
                    if self._cosine_similarity(question_embedding, seen_q_emb) > 0.9:
                        is_unique = False
                        break

                if is_unique and question_type == "MultipleChoice":
                    option_embeddings = [self.embedding_generator.get_embedding(opt) for opt in q["options"]]
                    for opt_emb in option_embeddings:
                        for seen_opt_emb in seen_option_embeddings:
                            if self._cosine_similarity(opt_emb, seen_opt_emb) > 0.95:
                                is_unique = False
                                break
                        if not is_unique:
                            break

                if is_unique:
                    seen_question_embeddings.append(question_embedding)
                    if question_type == "MultipleChoice":
                        seen_option_embeddings.extend([self.embedding_generator.get_embedding(opt) for opt in q["options"]])
                    unique_questions.append(q)
                if len(unique_questions) >= num_questions:
                    break

            if len(unique_questions) < num_questions:
                logger.warning(f"Generated only {len(unique_questions)} unique questions out of {num_questions} requested")
            return unique_questions
        except Exception as e:
            logger.error(f"Error deduplicating questions: {str(e)}")
            raise Exception(f"Error deduplicating questions: {str(e)}")

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculates cosine similarity between two vectors."""
        import math
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        return dot_product / (norm1 * norm2) if norm1 and norm2 else 0.0

    def evaluate_answer(self, exam_id: str, question_id: str, student_answer: str, user_id: str, db: Session) -> Dict[str, Any]:
        """Evaluates a student's answer and stores in question_results table."""
        try:
            question = db.query(QuizQuestion).filter(
                QuizQuestion.id == question_id,
                QuizQuestion.quiz_id == exam_id
            ).first()
            if not question:
                raise ValueError(f"Question {question_id} not found in quiz {exam_id}")

            is_correct = False
            score = 0.0
            if question.type == QuestionType.MultipleChoice:
                correct_idx = question.correct_answer
                student_answer_str = str(student_answer).strip()
                if student_answer_str == correct_idx or (question.options and student_answer_str == question.options[int(correct_idx)]):
                    is_correct = True
                    score = float(question.marks)
            elif question.type == QuestionType.ShortAnswer:
                # Check if student answer is empty or just whitespace
                if not student_answer or str(student_answer).strip() == '':
                    # No answer provided - give 0 marks
                    is_correct = False
                    score = 0.0
                else:
                    prompt = f"""
                    Evaluate the student's answer based on the correct answer and provide partial scoring.
                    Question: {question.question_text}
                    Correct Answer: {question.correct_answer}
                    Student Answer: {student_answer}
                    Total Marks: {question.marks}
                    
                    Instructions:
                    - Give full marks for completely correct answers
                    - Give partial marks (e.g., 50-80% of total) for partially correct answers that show understanding but miss some key points
                    - Give minimal marks (e.g., 10-30% of total) for answers that show some relevant knowledge but are mostly incorrect
                    - Give 0 marks for completely wrong or irrelevant answers
                    - Give 0 marks for empty or blank answers
                    
                    Return JSON: {{"is_correct": boolean, "score": float, "percentage": float}}
                    Where:
                    - is_correct: true if score is 100% of total marks, false otherwise
                    - score: actual marks awarded (between 0 and {question.marks})
                    - percentage: percentage of total marks awarded (0-100)
                    """
                    response = self.model.generate_content(prompt)
                    if not response or not hasattr(response, 'text') or not response.text:
                        logger.error(f"Invalid Gemini API response for evaluation: {response}")
                        raise ValueError("No valid response from Gemini API")
                    try:
                        eval_text = response.text.strip()
                        if eval_text.startswith("```json"):
                            eval_text = eval_text[7:]
                        if eval_text.endswith("```"):
                            eval_text = eval_text[:-3]
                        eval_text = eval_text.strip()

                        # Extract only the first JSON object or array
                        import re
                        json_match = re.search(r'(\{[^\}]*\}|\[[^\]]*\])', eval_text, re.DOTALL)
                        if not json_match:
                            logger.error(f"No JSON object found in evaluation response: {eval_text[:500]}")
                            raise ValueError("No JSON object found in evaluation response")
                        json_str = json_match.group(1)
                        result = json.loads(json_str)

                        # Use the score provided by the LLM for partial marking
                        awarded_score = result.get("score", 0.0)
                        max_marks = float(question.marks)
                        
                        # Ensure score doesn't exceed maximum marks
                        awarded_score = min(awarded_score, max_marks)
                        awarded_score = max(awarded_score, 0.0)  # Ensure non-negative
                        
                        # Consider answer correct if it gets more than 80% of total marks
                        is_correct = awarded_score >= (0.8 * max_marks)
                        score = awarded_score
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error in evaluation: {str(e)}, response: {response.text[:500]}")
                        raise ValueError(f"Invalid JSON response: {str(e)}")
            elif question.type == QuestionType.TrueFalse:
                is_correct = str(student_answer).lower() == question.correct_answer.lower()
                score = float(question.marks) if is_correct else 0.0

            # Store in question_results table
            question_result = QuestionResult(
                question_id=question_id,
                user_id=user_id,
                quiz_id=exam_id,
                score=score,
                is_correct=is_correct,
                student_answer=student_answer,
                created_at=datetime.now(timezone.utc)
            )
            db.merge(question_result)  # Upsert to handle retries
            db.commit()

            return {
                "question_id": question_id,
                "is_correct": is_correct,
                "score": score,
                "explanation": question.explanation or ""
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error evaluating answer: {str(e)}")
            raise ValueError(f"Error evaluating answer: {str(e)}")