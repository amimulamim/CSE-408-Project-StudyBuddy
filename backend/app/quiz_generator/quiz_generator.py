import json
import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
import google.generativeai as genai
from app.quiz_generator.models import *

logger = logging.getLogger(__name__)

class ExamGenerator:
    """Generates and evaluates quiz questions."""
    def __init__(self):
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.debug("Initialized generative model successfully")
        except Exception as e:
            logger.error(f"Error initializing generative model: {str(e)}")
            raise

    def generate_questions(self, context: str, num_questions: int, question_type: str) -> List[Dict[str, Any]]:
        """Generates questions based on context using Gemini API."""
        try:
            questions = []
            seen_questions = set()
            
            for i in range(num_questions):
                attempts = 0
                max_attempts = 3
                
                while attempts < max_attempts:
                    if question_type.lower() == "multiple_choice":
                        prompt = (
                            f"Based on the following context, generate a unique multiple-choice question (question {i+1}) with exactly 4 options. "
                            f"Ensure the question is distinct from previously generated questions. "
                            f"Check for each question whether it was previously generated. "
                            f"Do not generate questions that are similar to previously generated questions. "
                            f"Return the response in JSON format with fields: 'question', 'options' (list of 4 strings), 'correct_answer' (string matching one option), "
                            f"'type' ('MultipleChoice'), 'difficulty' ('Easy', 'Medium', or 'Hard').\n\n"
                            f"Context: {context[:2000]}"
                        )
                        result = self.model.generate_content(prompt)
                        try:
                            question_data = json.loads(result.text.strip('```json\n').strip('```'))
                            question_text = question_data.get("question")
                            if not question_text:
                                raise ValueError("Empty question text")
                            question_key = (question_text, tuple(question_data.get("options", [])))
                            if question_key in seen_questions:
                                logger.warning(f"Duplicate question detected: {question_text}. Retrying...")
                                attempts += 1
                                continue
                            seen_questions.add(question_key)
                            question_data = {
                                "type": question_data.get("type", "MultipleChoice"),
                                "question": question_text,
                                "question_id": str(uuid.uuid4()),
                                "options": [
                                    f"A. {question_data['options'][0]}",
                                    f"B. {question_data['options'][1]}",
                                    f"C. {question_data['options'][2]}",
                                    f"D. {question_data['options'][3]}"
                                ],
                                "correct_answer": question_data.get("correct_answer"),
                                "difficulty": question_data.get("difficulty", "Medium"),
                                "marks": 1,
                                "hints": [],
                                "explanation": None
                            }
                        except Exception as e:
                            logger.warning(f"Failed to parse Gemini response: {str(e)}. Retrying...")
                            attempts += 1
                            continue
                    elif question_type.lower() == "true_false":
                        prompt = (
                            f"Based on the following context, generate a unique true/false question (question {i+1}). "
                            f"Ensure the question is distinct from previously generated questions. "
                            f"Check for each question whether it was previously generated. "
                            f"Do not generate questions that are similar to previously generated questions. "
                            f"Return the response in JSON format with fields: 'question' (string), 'correct_answer' (boolean), "
                            f"'type' ('TrueFalse'), 'difficulty' ('Easy', 'Medium', or 'Hard').\n\n"
                            f"Context: {context[:2000]}"
                        )
                        result = self.model.generate_content(prompt)
                        try:
                            question_data_raw = json.loads(result.text.strip('```json\n').strip('```'))
                            question_text = question_data_raw.get("question")
                            if not question_text:
                                raise ValueError("Empty question text")
                            if question_text in seen_questions:
                                logger.warning(f"Duplicate question detected: {question_text}. Retrying...")
                                attempts += 1
                                continue
                            seen_questions.add(question_text)
                            question_data = {
                                "type": question_data_raw.get("type", "TrueFalse"),
                                "question": question_text,
                                "question_id": str(uuid.uuid4()),
                                "options": ["True", "False"],
                                "correct_answer": str(question_data_raw.get("correct_answer", True)),
                                "difficulty": question_data_raw.get("difficulty", "Medium"),
                                "marks": 1,
                                "hints": [],
                                "explanation": None
                            }
                        except Exception as e:
                            logger.warning(f"Failed to parse Gemini response: {str(e)}. Retrying...")
                            attempts += 1
                            continue
                    else:  # short_answer
                        prompt = (
                            f"Based on the following context, generate a unique short-answer question (question {i+1}). "
                            f"Ensure the question is distinct from previously generated questions. "
                            f"Check for each question whether it was previously generated. "
                            f"Do not generate questions that are similar to previously generated questions. "
                            f"Return the response in JSON format with fields: 'question' (string), 'correct_answer' (string), "
                            f"'type' ('ShortAnswer'), 'difficulty' ('Easy', 'Medium', or 'Hard').\n\n"
                            f"Context: {context[:2000]}"
                        )
                        result = self.model.generate_content(prompt)
                        try:
                            question_data_raw = json.loads(result.text.strip('```json\n').strip('```'))
                            question_text = question_data_raw.get("question")
                            if not question_text:
                                raise ValueError("Empty question text")
                            if question_text in seen_questions:
                                logger.warning(f"Duplicate question detected: {question_text}. Retrying...")
                                attempts += 1
                                continue
                            seen_questions.add(question_text)
                            question_data = {
                                "type": question_data_raw.get("type", "ShortAnswer"),
                                "question": question_text,
                                "question_id": str(uuid.uuid4()),
                                "options": [],
                                "correct_answer": question_data_raw.get("correct_answer", ""),
                                "difficulty": question_data_raw.get("difficulty", "Medium"),
                                "marks": 1,
                                "hints": [],
                                "explanation": None
                            }
                        except Exception as e:
                            logger.warning(f"Failed to parse Gemini response: {str(e)}. Retrying...")
                            attempts += 1
                            continue
                    
                    questions.append(question_data)
                    break
                
                if attempts >= max_attempts:
                    logger.error(f"Failed to generate unique question {i+1} after {max_attempts} attempts.")
                    raise Exception(f"Unable to generate unique question {i+1} after {max_attempts} attempts.")
            
            return questions
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            raise Exception(f"Error generating questions: {str(e)}")

    def evaluate_answer(self, exam_id: str, question_id: str, student_answer: Any, db: Session) -> Dict[str, Any]:
        """Evaluates a student's answer against the correct answer."""
        try:
            # from app.models import QuizQuestion
            question = db.query(QuizQuestion).filter(
                QuizQuestion.quiz_id == exam_id,
                QuizQuestion.id == question_id
            ).first()
            if not question:
                raise ValueError(f"Quiz {exam_id} or question {question_id} not found")
            
            question_data = {
                "question": question.question_text,
                "type": question.type.value,
                "options": question.options or [],
                "correct_answer": question.correct_answer,
                "marks": question.marks
            }
            question_type = question_data["type"].lower()
            correct_answer = question_data["correct_answer"]
            result = {
                "question": question_data["question"],
                "question_id": question_id,
                "student_answer": student_answer,
                "is_correct": False,
                "score": 0.0
            }
            
            if question_type == "multiplechoice":
                result["is_correct"] = str(student_answer).strip() == str(correct_answer).strip()
                result["score"] = float(question_data["marks"]) if result["is_correct"] else 0.0
                logger.debug(f"Evaluated multiple-choice: {result}")
            
            elif question_type == "truefalse":
                result["is_correct"] = bool(student_answer) == (correct_answer.lower() == "true")
                result["score"] = float(question_data["marks"]) if result["is_correct"] else 0.0
                logger.debug(f"Evaluated true/false: {result}")
            
            elif question_type == "shortanswer":
                prompt = (
                    f"Evaluate whether the student's answer is semantically equivalent to the correct answer. "
                    f"Return a JSON response with fields: 'is_correct' (boolean) and 'score' (float between 0 and {question_data['marks']}, representing similarity).\n\n"
                    f"Correct answer: {correct_answer}\n"
                    f"Student answer: {student_answer}"
                )
                try:
                    response = self.model.generate_content(prompt)
                    evaluation = json.loads(response.text.strip('```json\n').strip('```'))
                    result["is_correct"] = evaluation.get("is_correct", False)
                    result["score"] = float(evaluation.get("score", 0.0))
                    logger.debug(f"Evaluated short-answer: {result}")
                except Exception as e:
                    logger.warning(f"Failed to evaluate short-answer with Gemini: {str(e)}. Using string comparison.")
                    result["is_correct"] = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
                    result["score"] = float(question_data["marks"]) if result["is_correct"] else 0.0
            
            return result
        except Exception as e:
            logger.error(f"Error evaluating answer: {str(e)}")
            raise Exception(f"Error evaluating answer: {str(e)}")