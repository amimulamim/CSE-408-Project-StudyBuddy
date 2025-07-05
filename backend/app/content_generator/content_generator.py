import uuid
import logging
import json
import asyncio
import subprocess
import tempfile
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.document_upload.document_service import DocumentService
from app.core.config import settings
import google.generativeai as genai
from app.content_generator.models import ContentItem
from firebase_admin import storage
from io import StringIO

logger = logging.getLogger(__name__)

class ContentGenerator:
    """Generates educational content (flashcards, slides) using RAG."""
    def __init__(self):
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
            self.document_service = DocumentService()
        except Exception as e:
            logger.error(f"Error initializing ContentGenerator: {str(e)}")
            raise

    async def generate_and_store_content(
        self,
        content_id: str,
        user_id: str,
        content_type: str,
        topic: str,
        difficulty: str,
        length: str,
        tone: str,
        collection_name: str,
        full_collection_name: str,
        db: Session
    ) -> None:
        """Generates content, stores it in Firebase, and saves metadata in database."""
        try:
            # Retrieve relevant documents
            documents = await self.document_service.search_documents(
                query=topic,
                user_id=user_id,
                collection_name=collection_name,
                limit=5
            )
            context = "\n".join([doc["content"] for doc in documents])
            if not context:
                logger.warning(f"No relevant documents found for topic: {topic}")
                raise ValueError("No relevant documents found")

            bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)

            # Generate content
            if content_type == "flashcards":
                content = await self._generate_flashcards(context, topic, difficulty, length, tone)
                file_content = json.dumps(content, indent=2)
                file_extension = "json"
                storage_path = f"content/{user_id}/{content_id}.{file_extension}"
                blob = bucket.blob(storage_path)
                blob.upload_from_string(file_content, content_type=f"text/{file_extension}")
                blob.make_public()
                content_url = blob.public_url
            elif content_type == "slides":
                pdf_bytes, latex_source = await self._generate_slides(context, topic, difficulty, length, tone, return_latex=True)
                # Upload PDF
                file_extension = "pdf"
                storage_path_pdf = f"content/{user_id}/{content_id}.pdf"
                blob_pdf = bucket.blob(storage_path_pdf)
                blob_pdf.upload_from_string(pdf_bytes, content_type="application/pdf")
                blob_pdf.make_public()
                content_url = blob_pdf.public_url
                # Upload .tex with a new unique id
                tex_id = str(uuid.uuid4())
                storage_path_tex = f"content/{user_id}/{tex_id}.tex"
                blob_tex = bucket.blob(storage_path_tex)
                blob_tex.upload_from_string(latex_source, content_type="text/x-tex")
                blob_tex.make_public()
                tex_url = blob_tex.public_url
                # Store LaTeX as a separate ContentItem
                tex_item = ContentItem(
                    id=tex_id,
                    user_id=user_id,
                    content_url=tex_url,
                    topic=topic,
                    content_type="latex",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(tex_item)
            else:
                raise ValueError(f"Unsupported content type: {content_type}")

            # Store metadata in database
            content_item = ContentItem(
                id=content_id,
                user_id=user_id,
                content_url=content_url,
                topic=topic,
                content_type=content_type,
                created_at=datetime.now(timezone.utc)
            )
            db.add(content_item)
            db.commit()
            logger.debug(f"Generated and stored {content_type} content {content_id} for user {user_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error generating content {content_id}: {str(e)}")
            raise

    async def _generate_flashcards(
        self,
        context: str,
        topic: str,
        difficulty: str,
        length: str,
        tone: str
    ) -> List[Dict[str, str]]:
        """Generates flashcards as a JSON list."""
        try:
            num_cards = {"short": 5, "medium": 10, "long": 15}.get(length, 10)
            prompt = f"""
            You are an expert educator creating flashcards on the topic '{topic}' with a {tone} tone and {difficulty} difficulty.
            Based on the following context, generate {num_cards} flashcards:
            {context}
            
            Each flashcard should have:
            - front: A question or term
            - back: The answer or definition
            
            Return the output as a JSON array:
            ```json
            [
                {{"front": "Question or term", "back": "Answer or definition"}}
            ]
            """
            # Run synchronous Gemini call in a thread
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            if not response or not hasattr(response, 'text') or not response.text:
                raise ValueError("No valid response from Gemini API")

            json_start = response.text.find('```json')
            json_end = response.text.rfind('```')
            if json_start != -1 and json_end != -1:
                response_text = response.text[json_start + 7:json_end].strip()
            else:
                response_text = response.text.strip()

            flashcards = json.loads(response_text)
            if not isinstance(flashcards, list) or not all("front" in f and "back" in f for f in flashcards):
                raise ValueError("Invalid flashcard format")
            
            return flashcards
        except Exception as e:
            logger.error(f"Error generating flashcards: {str(e)}")
            raise Exception(f"Error generating flashcards: {str(e)}")

    async def _generate_slides(
        self,
        context: str,
        topic: str,
        difficulty: str,
        length: str,
        tone: str,
        max_retries: int = 3,
        return_latex: bool = False
    ) -> Any:
        """Generates LaTeX slides and compiles to PDF, retrying on error. Returns PDF bytes and optionally the LaTeX source."""
        for attempt in range(1, max_retries + 1):
            try:
                num_slides = {"short": 5, "medium": 10, "long": 15}.get(length, 10)
                prompt = f"""
                You are an expert educator creating a LaTeX Beamer presentation on the topic '{topic}' with a {tone} tone and {difficulty} difficulty.
                Based on the following context, generate {num_slides} slides:
                {context}
                Use the Beamer class with proper LaTeX syntax. Return ONLY the LaTeX code starting with \\begin{{document}} and ending with \\end{{document}}.
                Do NOT include markdown, code fences (e.g., ```latex), or any explanatory text outside the LaTeX code.
                Ensure each slide has:
                - A clear title using \\frame{{\\frametitle{{Title}}}}
                - Concise content (bullet points, equations, or diagrams using \\itemize, \\amsmath, or \\tikz where appropriate)
                - Valid LaTeX syntax that compiles without errors
                - strictly follow the example structure . No need to add anything extra before or after the example structure .
                - don't hallucinate
                Example structure:
                \\begin{{document}}
                \\frame{{\\frametitle{{Introduction}} \\begin{{itemize}} \\item Point 1 \\end{{itemize}}}}
                \\end{{document}}
                """
                response = await asyncio.to_thread(self.model.generate_content, prompt)
                if not response or not hasattr(response, 'text') or not response.text:
                    raise ValueError("No valid response from Gemini API")
                latex_content = response.text.strip()
                if latex_content.startswith('```latex') or latex_content.startswith('```'):
                    latex_content = latex_content[latex_content.find('\n')+1:].strip()
                if latex_content.endswith('```'):
                    latex_content = latex_content[:latex_content.rfind('```')].strip()
                if not latex_content.startswith("\\begin{document}"):
                    latex_content = "\\begin{document}\n" + latex_content
                if not latex_content.endswith("\\end{document}"):
                    latex_content += "\n\\end{document}"
                preamble = f"""\\documentclass{{beamer}}
\\usetheme{{Copenhagen}}
\\usepackage{{amsmath,amsfonts,amssymb}}
\\usepackage{{graphicx}}
\\usepackage{{tikz}}
\\usepackage{{booktabs}}
\\usepackage{{multicol}}
\\setbeamertemplate{{navigation symbols}}{{}}
\\title{{{topic}}}
\\author{{StudyBuddy}}
\\date{{\\today}}

"""
                full_latex = preamble + latex_content
                # Compile LaTeX to PDF
                with tempfile.TemporaryDirectory() as tmpdir:
                    tex_path = os.path.join(tmpdir, "slides.tex")
                    pdf_path = os.path.join(tmpdir, "slides.pdf")
                    with open(tex_path, "w", encoding="utf-8") as f:
                        f.write(full_latex)
                    proc = await asyncio.to_thread(
                        subprocess.run,
                        ["pdflatex", "-interaction=nonstopmode", tex_path],
                        cwd=tmpdir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=30
                    )
                    if proc.returncode == 0 and os.path.exists(pdf_path):
                        with open(pdf_path, "rb") as pdf_file:
                            pdf_bytes = pdf_file.read()
                        if return_latex:
                            return pdf_bytes, full_latex
                        return pdf_bytes
                    else:
                        logger.warning(f"LaTeX compilation failed on attempt {attempt}: {proc.stderr.decode('utf-8')}")
                        if attempt == max_retries:
                            raise Exception(f"LaTeX compilation failed after {max_retries} attempts. Last error: {proc.stderr.decode('utf-8')}")
                        # Prompt LLM to retry by continuing loop
            except Exception as e:
                logger.error(f"Error generating/compiling slides (attempt {attempt}): {str(e)}")
                if attempt == max_retries:
                    raise Exception(f"Error generating slides after {max_retries} attempts: {str(e)}")
        raise Exception("Failed to generate valid slides after retries.")

