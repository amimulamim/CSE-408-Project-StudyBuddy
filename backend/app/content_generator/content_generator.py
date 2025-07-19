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
        special_instructions: str,
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
            
            # Check if context is sufficient for the requested length
            context_words = len(context.split())
            # Updated minimum requirements for larger presentations
            min_words_needed = {"short": 150, "medium": 300, "long": 500}.get(length, 300)
            
            if context_words < min_words_needed:
                logger.warning(f"Insufficient context for {length} content. Found {context_words} words, need at least {min_words_needed}")
                # Adjust length to match available content more intelligently
                if context_words < 150:
                    raise ValueError("Insufficient content available for meaningful slide generation (need at least 150 words)")
                elif context_words < 300:
                    length = "short"  # Downgrade to short presentation
                    logger.info(f"Adjusting to short presentation due to limited context ({context_words} words)")
                elif context_words < 500 and length == "long":
                    length = "medium"  # Downgrade from long to medium
                    logger.info(f"Adjusting to medium presentation due to limited context ({context_words} words)")

            bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
            raw_source_url = None  # Initialize raw_source_url variable

            # Generate content
            if content_type == "flashcards":
                content = await self._generate_flashcards(context, topic, difficulty, length, tone, special_instructions)
                file_content = json.dumps(content, indent=2)
                file_extension = "json"
                storage_path = f"content/{user_id}/{content_id}.{file_extension}"
                blob = bucket.blob(storage_path)
                blob.upload_from_string(file_content, content_type=f"text/{file_extension}")
                blob.make_public()
                content_url = blob.public_url
            elif content_type == "slides":
                # Use adjusted length if context was insufficient
                actual_length = length  # length may have been adjusted above
                    
                pdf_bytes, latex_source = await self._generate_slides(context, topic, difficulty, actual_length, tone, return_latex=True, special_instructions=special_instructions)
                if pdf_bytes:
                    # Successful compilation - upload PDF
                    file_extension = "pdf"
                    storage_path_pdf = f"content/{user_id}/{content_id}.pdf"
                    blob_pdf = bucket.blob(storage_path_pdf)
                    blob_pdf.upload_from_string(pdf_bytes, content_type="application/pdf")
                    blob_pdf.make_public()
                    content_url = blob_pdf.public_url
                    
                    # Also save the LaTeX source for future moderation/editing
                    storage_path_tex = f"content/{user_id}/{content_id}.tex"
                    blob_tex = bucket.blob(storage_path_tex)
                    blob_tex.upload_from_string(latex_source, content_type="text/x-tex")
                    blob_tex.make_public()
                    raw_source_url = blob_tex.public_url
                else:
                    # Compilation failed but we have LaTeX source - save for moderation
                    logger.warning(f"Slides compilation failed for content {content_id}, saving LaTeX for moderation")
                    storage_path_tex = f"content/{user_id}/{content_id}_pending.tex"
                    blob_tex = bucket.blob(storage_path_tex)
                    blob_tex.upload_from_string(latex_source, content_type="text/x-tex")
                    blob_tex.make_public()
                    content_url = blob_tex.public_url
                    raw_source_url = blob_tex.public_url
                    # Mark content as pending moderation
                    content_type = "slides_pending"
            else:
                raise ValueError(f"Unsupported content type: {content_type}")

            # Store metadata in database
            content_item = ContentItem(
                id=content_id,
                user_id=user_id,
                collection_name=collection_name.strip(),  # Store the collection name (trimmed)
                content_url=content_url,
                topic=topic,
                content_type=content_type,
                raw_source=raw_source_url if content_type in ["slides", "slides_pending"] else None,
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
        tone: str,
        special_instructions: str = ""
    ) -> List[Dict[str, str]]:
        """Generates flashcards as a JSON list."""
        try:
            num_cards = {"short": 5, "medium": 10, "long": 15}.get(length, 10)
            
            # Build special instructions section
            instructions_section = ""
            if special_instructions and special_instructions.strip():
                instructions_section = f"""
            
            SPECIAL USER INSTRUCTIONS:
            {special_instructions.strip()}
            
            Please follow these specific instructions while creating the flashcards.
            """
            
            prompt = f"""
            You are an expert educator creating flashcards on the topic '{topic}' with a {tone} tone and {difficulty} difficulty.
            Based on the following context, generate {num_cards} flashcards:
            {context}
            {instructions_section}
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
        max_retries: int = 5,
        return_latex: bool = False,
        special_instructions: str = ""
    ) -> Any:
        """Generates LaTeX slides and compiles to PDF, retrying on error. Returns PDF bytes and optionally the LaTeX source."""
        last_latex_source = None
        
        for attempt in range(1, max_retries + 1):
            try:
                # Updated slide counts: short <10, medium <20, long 20+
                num_slides = {"short": 8, "medium": 16, "long": 24}.get(length, 16)
                
                # Calculate content distribution based on available context
                context_words = len(context.split())
                context_sentences = len([s for s in context.replace('.', '.|').replace('!', '!|').replace('?', '?|').split('|') if s.strip()])
                
                # Determine optimal content density to prevent slide overflow
                if context_words < 200:
                    content_density = "concise"
                    points_per_slide = "2-3"
                    max_subpoints = 1
                elif context_words < 500:
                    content_density = "balanced"
                    points_per_slide = "3-4"
                    max_subpoints = 2
                else:
                    content_density = "detailed"
                    points_per_slide = "3-4"  # Reduced from 4-6 to prevent overflow
                    max_subpoints = 2
                
                # Build special instructions section
                instructions_section = ""
                if special_instructions and special_instructions.strip():
                    instructions_section = f"""
                
                SPECIAL USER INSTRUCTIONS:
                {special_instructions.strip()}
                
                Please follow these specific instructions while creating the presentation. Incorporate these requirements into all slides and content structure.
                """
                
                prompt = f"""
                You are an expert educator creating a comprehensive LaTeX Beamer presentation on the topic '{topic}' with a {tone} tone and {difficulty} difficulty.
                Based on the following context, create exactly {num_slides} well-structured slides that form a complete, informative presentation:
                
                CONTEXT TO USE:
                {context}
                {instructions_section}
                PRESENTATION REQUIREMENTS:
                Target: {num_slides} slides total ({length} presentation: {"<10" if length == "short" else "<20" if length == "medium" else "20+"} pages)
                Content Density: {content_density} ({points_per_slide} substantial points per slide)
                Available Content: {context_words} words, {context_sentences} sentences
                
                MANDATORY STRUCTURE:
                1. TITLE SLIDE (Slide 1):
                   - Use \\titlepage command only
                   - Must be first slide
                
                2. OVERVIEW/OUTLINE SLIDE (Slide 2):
                   - Present main topics to be covered
                   - 3-5 clear section headings
                   - Brief description of what will be learned
                
                3. CONTENT SLIDES (Slides 3 to {num_slides-1}):
                   - Each slide covers one major concept/topic
                   - {points_per_slide} substantial bullet points or numbered items per slide
                   - Each main point should be 1-2 complete sentences (maximum 25 words per bullet)
                   - Include specific details, examples, or explanations from context
                   - Use maximum 1-2 subpoints per main point to avoid overcrowding
                   - Keep slides readable - prioritize clarity over quantity of information
                   - CRITICAL: Each slide must fit comfortably on one page without text overflow
                
                4. CONCLUSION/SUMMARY SLIDE (Slide {num_slides}):
                   - Summarize key takeaways
                   - Highlight most important concepts
                   - Suggest next steps or applications
                
                CONTENT QUALITY STANDARDS:
                ✓ NEVER use placeholder text like "...", "etc.", "and more"
                ✓ Each bullet point must be a complete, informative statement (minimum 8-12 words, maximum 25 words)
                ✓ Use specific information from the provided context
                ✓ Provide examples, definitions, or explanations where relevant
                ✓ Maintain logical flow between slides
                ✓ Ensure each slide feels substantial and worthwhile
                ✓ If context is limited, focus deeply on available material rather than adding unrelated content
                ✓ MINIMUM {points_per_slide} bullet points per content slide - NO EXCEPTIONS
                ✓ Each slide must justify its existence with meaningful content
                ✓ CRITICAL: Limit total text per slide to prevent overflow - max 6 lines of bullet points
                ✓ Keep subpoints concise (maximum 15 words each) and use sparingly
                ✓ Prefer fewer, well-developed points over many short points
                
                SLIDE CONTENT DISTRIBUTION:
                - Distribute content evenly across {num_slides-2} content slides
                - Each slide should feel complete and informative
                - Use varied formatting: bullet points, numbered lists, definitions
                - Include relevant formulas, processes, or step-by-step explanations
                - Make connections between concepts explicit
                - Balance content depth: don't put all information on one slide
                - Ensure progressive disclosure of information across slides
                - CRITICAL TEXT LIMITS: Maximum 6-8 lines of content per slide to prevent overflow
                - If a concept needs more explanation, split it across multiple slides
                - Prioritize readability over information density
                
                STRICT LaTeX FORMATTING RULES:
                - Use LaTeX Beamer syntax only
                - Generate ONLY the slide content between \\begin{{document}} and \\end{{document}}
                - Do NOT include \\documentclass, \\title, \\author, \\date, or any preamble commands
                - Do NOT duplicate \\begin{{document}} or \\end{{document}} - these are added automatically
                - Start directly with the first \\begin{{frame}} command
                - Use LaTeX Beamer syntax only: \\begin{{frame}}...\\end{{frame}}
                - Each slide must be created with: \\begin{{frame}}...\\end{{frame}}
                - If the slide contains code or uses \\verb, \\texttt (with special characters), or \\begin{{verbatim}}, use \\begin{{frame}}[fragile]
                - NEVER use \\texttt for multi-line code or anything containing quotes, slashes, or backslashes
                - Use only \\begin{{verbatim}} or \\begin{{lstlisting}} for multi-line code blocks, and always inside a [fragile] frame
                - CRITICAL: Use \\begin{{frame}}[fragile] for ANY frame containing:
                  * \\verb commands
                  * \\texttt with special characters ($, %, &, #, \\, {{, }}, etc.)
                  * \\begin{{verbatim}} blocks
                  * Code examples or programming syntax
                  * Any backslashes, dollar signs, or special LaTeX characters in text
                - For multi-line code, ALWAYS use \\begin{{verbatim}}...\\end{{verbatim}} inside [fragile] frames
                - NEVER use \\texttt for anything containing special characters - use \\begin{{verbatim}} instead
                - Do not forget to escape special characters ($ % & # \\ {{ }}) in LaTeX text mode
                - For inline code with special characters, use \\begin{{verbatim}} on separate lines instead of \\texttt 

                CRITICAL CHARACTER ENCODING RULES:
                - NEVER use special Unicode characters like ×, ∇, ⊙, •, –, —, ", ", ', '
                - Use proper LaTeX math mode for mathematical symbols: $\\times$, $\\nabla$, $\\odot$
                - Use standard ASCII characters: -, x, *, +, =, <, >, etc.
                - For multiplication use: $\\times$ or $\\cdot$ in math mode
                - For bullets use standard LaTeX itemize (automatic bullets)
                - For subscripts use: $\\text{{subscript}}$ or \\textsubscript{{text}}
                - For mathematical expressions, always use math mode: $expression$
                - Use \\textbf{{}} for bold text, \\textit{{}} for italic text
                - Use standard ASCII quotes: " instead of " or "
                - Use standard hyphens and dashes: - instead of – or —

                MATH MODE REQUIREMENTS:
                - All mathematical expressions MUST be in math mode: $expression$
                - Variables: $x$, $y$, $z$, $N$, $P$, etc.
                - Equations: $N = (b-a) \\times (c-a)$
                - Greek letters: $\\alpha$, $\\beta$, $\\gamma$, $\\nabla$
                - Mathematical operators: $\\times$, $\\cdot$, $\\div$, $\\pm$
                - Fractions: $\\frac{{numerator}}{{denominator}}$
                - Subscripts and superscripts: $x_1$, $x^2$
                
                FRAGILE FRAMES:
                - Use \\begin{{frame}}[fragile] ONLY for code blocks or verbatim content
                - If using \\texttt with special characters, use [fragile]
                - For mathematical content, use regular frames with proper math mode
                - Code blocks must use \\begin{{verbatim}} or \\begin{{lstlisting}}
                
                SAFE FORMATTING:
                - Do NOT use \\section, \\subsection, or markdown (e.g., ###, **bold**, ```latex)
                - Do NOT include any unnecessary explanation, markdown fences, or extra content
                - Stick to basic LaTeX commands that compile reliably
                - Test readability: avoid overly complex formatting



                EXAMPLE SLIDE STRUCTURE:
                \\begin{{frame}}
                \\frametitle{{Mathematical Concepts}}
                \\begin{{itemize}}
                \\item First comprehensive point with specific details from context
                \\begin{{itemize}}
                \\item Supporting detail or example with proper math: $x = y + z$
                \\item Additional clarification: Use $\\times$ instead of × for multiplication
                \\end{{itemize}}
                \\item Second substantial point covering different aspect
                \\item Mathematical formula: $N = (b-a) \\times (c-a)$ where variables are in math mode
                \\item Practical application: Calculate $|N| = 1$ for unit normal vectors
                \\end{{itemize}}
                \\end{{frame}}
                
                LATEX COMPILATION SAFETY:
                - Always use ASCII characters in text: -, +, =, <, >
                - Put ALL mathematical content in math mode: $content$
                - Use \\textbf{{bold}} and \\textit{{italic}} for emphasis
                - Use \\textsubscript{{sub}} and \\textsuperscript{{sup}} for non-math subscripts
                - Avoid Unicode symbols completely - they cause compilation failures
                - Test mental compilation: would this LaTeX compile on a basic system?
                
                CRITICAL REQUIREMENTS:
                - Generate exactly {num_slides} slides (including title and conclusion)
                - Each content slide must be well-filled with {points_per_slide} substantial points
                - No empty slides, no single-sentence slides, no minimal content slides
                - Use ALL relevant information from the context effectively
                - Create a cohesive, educational presentation worthy of {num_slides} slides
                - NEVER generate slides with only 1-2 bullet points - always fill slides appropriately
                - If you cannot fill {num_slides} slides with quality content, focus on fewer slides with more detailed content per slide
                - SLIDE OVERFLOW PREVENTION: Ensure no slide exceeds 7-8 lines of total content including subpoints
                - Break long explanations across multiple slides rather than cramming into one
                - Use concise, impactful language to maximize information density without overwhelming
                - Test slide readability: each slide should be readable in a 2-minute window
                """


                response = await asyncio.to_thread(self.model.generate_content, prompt)
                if not response or not hasattr(response, 'text') or not response.text:
                    raise ValueError("No valid response from Gemini API")
                latex_content = response.text.strip()
                
                # Clean up markdown formatting
                if latex_content.startswith('```latex') or latex_content.startswith('```'):
                    latex_content = latex_content[latex_content.find('\n')+1:].strip()
                if latex_content.endswith('```'):
                    latex_content = latex_content[:latex_content.rfind('```')].strip()
                
                # Replace problematic Unicode characters with LaTeX equivalents
                unicode_replacements = {
                    '×': r'$\times$',
                    '∇': r'$\nabla$',
                    '⊙': r'$\odot$',
                    '•': r'',  # Remove bullets, itemize handles them
                    '–': r'-',
                    '—': r'--',
                    '"': r'"',  # Left smart quote
                    '"': r'"',  # Right smart quote
                    ''': r"'",  # Left smart quote
                    ''': r"'",  # Right smart quote
                    '…': r'...',
                    '≤': r'$\leq$',
                    '≥': r'$\geq$',
                    '≠': r'$\neq$',
                    '±': r'$\pm$',
                    '∞': r'$\infty$',
                    '∈': r'$\in$',
                    '∩': r'$\cap$',
                    '∪': r'$\cup$',
                    '⟨': r'$\langle$',
                    '⟩': r'$\rangle$',
                    'â‹…': r'$\cdot$',  # Sometimes appears as mangled encoding
                    'âˆ‡': r'$\nabla$',  # Sometimes appears as mangled encoding
                    'âŠ™': r'$\odot$',   # Sometimes appears as mangled encoding
                    'Ã—': r'$\times$',   # Sometimes appears as mangled encoding
                }
                
                for unicode_char, latex_replacement in unicode_replacements.items():
                    latex_content = latex_content.replace(unicode_char, latex_replacement)
                
                # Remove any duplicate preamble elements that AI might have added
                lines = latex_content.split('\n')
                cleaned_lines = []
                skip_until_frame = False
                
                for line in lines:
                    line = line.strip()
                    # Skip duplicate preamble commands
                    if (line.startswith('\\documentclass') or 
                        line.startswith('\\usetheme') or 
                        line.startswith('\\title{') or 
                        line.startswith('\\author{') or 
                        line.startswith('\\date{') or
                        line == '\\begin{document}' or
                        line == '\\end{document}'):
                        if line.startswith('\\begin{frame}'):
                            skip_until_frame = False
                            cleaned_lines.append(line)
                        continue
                    
                    # Start collecting content from first frame
                    if line.startswith('\\begin{frame}'):
                        skip_until_frame = False
                    
                    if not skip_until_frame:
                        cleaned_lines.append(line)
                
                latex_content = '\n'.join(cleaned_lines).strip()
                
                # Ensure proper document structure
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
\\usepackage{{listings}}
\\usepackage{{xcolor}}
\\setbeamertemplate{{navigation symbols}}{{}}
\\setbeamertemplate{{footline}}[frame number]

% Improve slide spacing and prevent overflow
\\setbeamertemplate{{itemize/enumerate body begin}}{{\\vspace{{0.2em}}}}
\\setbeamertemplate{{itemize/enumerate subbody begin}}{{\\vspace{{0.1em}}}}
\\setlength{{\\leftmargini}}{{1.2em}}
\\setlength{{\\leftmarginii}}{{1em}}

% Set frame title spacing
\\setbeamertemplate{{frametitle}}{{%
  \\nointerlineskip%
  \\begin{{beamercolorbox}}[wd=\\paperwidth,ht=2.75ex,dp=1.375ex]{{frametitle}}
    \\hspace*{{1ex}}\\insertframetitle%
  \\end{{beamercolorbox}}%
  \\vspace{{0.5em}}%
}}

\\title{{{topic}}}
\\author{{StudyBuddy}}
\\date{{\\today}}

% Configure listings for better code display
\\lstset{{
    basicstyle=\\footnotesize\\ttfamily,
    breaklines=true,
    breakatwhitespace=false,
    showstringspaces=false,
    tabsize=2,
    frame=single,
    backgroundcolor=\\color{{gray!10}}
}}

"""
                full_latex = preamble + latex_content
                last_latex_source = full_latex  # Store the latest LaTeX source
                
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
                        stderr_output = proc.stderr.decode('utf-8')
                        logger.warning(f"LaTeX compilation failed on attempt {attempt}: {stderr_output}")
                        
                        # If this is not the last attempt, provide feedback to improve the LaTeX
                        if attempt < max_retries:
                            # Add specific error feedback to the prompt for the next iteration
                            # Common LaTeX compilation errors and their fixes
                            common_errors = {
                                "Undefined control sequence": "avoiding undefined LaTeX commands and using only standard LaTeX commands",
                                "Missing $": "ensuring proper math mode syntax - put all mathematical expressions in $...$",
                                "Runaway argument": "checking for unmatched braces or brackets and avoiding special Unicode characters",
                                "File ended while scanning": "ensuring all environments are properly closed",
                                "Extra }": "balancing braces correctly",
                                "LaTeX Error": "fixing LaTeX syntax errors and using only ASCII characters",
                                "duplicate": "removing duplicate preamble commands",
                                "Unicode": "using only ASCII characters - replace × with $\\times$, ∇ with $\\nabla$, • with standard bullets",
                                "Package inputenc Error": "avoiding Unicode characters and using proper LaTeX encoding",
                                "Unknown character": "using only standard ASCII characters and proper LaTeX math symbols",
                                "Invalid UTF-8": "replacing all special characters with proper LaTeX equivalents",
                                "verb": "using [fragile] frames for all \\verb commands and \\texttt with special characters",
                                "fragile": "marking frames as [fragile] when using \\verb, \\texttt with special chars, or \\begin{verbatim}",
                                "verbatim": "using [fragile] frames for all verbatim environments and code blocks"
                            }
                            
                            error_feedback = ""
                            # Check for common errors to help with next iteration
                            for error_pattern, hint in common_errors.items():
                                if error_pattern.lower() in stderr_output.lower():
                                    error_feedback = f"\n\nIMPORTANT: Previous attempt failed due to LaTeX compilation error. Focus on {hint}. "
                                    if "duplicate" in stderr_output.lower() or "already defined" in stderr_output.lower():
                                        error_feedback += "Do NOT include \\documentclass, \\title, \\author, \\date, \\begin{document}, or \\end{document} commands. Start directly with \\begin{frame}."
                                    break
                            
                            # Update the prompt with error feedback for next iteration
                            prompt = prompt + error_feedback
                            logger.info(f"Detected LaTeX error. Will retry with improved guidance: {error_feedback}")
                            
                            # Continue to next iteration with error feedback
                            continue
                        else:
                            # Last attempt failed - return None for PDF and LaTeX for moderation
                            if return_latex:
                                return None, last_latex_source
                            return None
            except Exception as e:
                logger.error(f"Error generating/compiling slides (attempt {attempt}): {str(e)}")
                if attempt == max_retries:
                    # Return None for PDF and the LaTeX source for moderation
                    if return_latex and last_latex_source:
                        return None, last_latex_source
                    elif last_latex_source:
                        return None
                    else:
                        raise Exception(f"Failed to generate valid slides after {max_retries} attempts. Please try again with a different topic or check your collection documents.")
        
        # Final fallback - if we have LaTeX source, return it for moderation
        if last_latex_source:
            if return_latex:
                return None, last_latex_source
            return None
            
        raise Exception(f"Failed to generate valid slides after {max_retries} retries. Please try again with a different topic or check your collection documents.")

    def update_content_collection_names(
        self,
        user_id: str,
        old_collection_name: str,
        new_collection_name: str,
        db: Session
    ) -> bool:
        """Updates all content items when a collection is renamed."""
        try:
            from sqlalchemy import func
            
            # Trim input parameters
            old_collection_name = old_collection_name.strip()
            new_collection_name = new_collection_name.strip()
            
            # Update all content items that belong to the renamed collection
            updated_count = db.query(ContentItem).filter(
                ContentItem.user_id == user_id,
                func.trim(ContentItem.collection_name) == old_collection_name
            ).update({
                ContentItem.collection_name: new_collection_name
            }, synchronize_session=False)
            
            db.commit()
            logger.info(f"Updated {updated_count} content items from collection '{old_collection_name}' to '{new_collection_name}' for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating content collection names: {str(e)}")
            return False

    def get_content_by_collection(
        self,
        user_id: str,
        collection_name: str,
        db: Session
    ) -> List[ContentItem]:
        """Retrieves all content items for a specific collection."""
        try:
            from sqlalchemy import func
            
            # Trim input parameter
            collection_name = collection_name.strip()
            
            # Use database trimming for consistent matching
            content_items = db.query(ContentItem).filter(
                ContentItem.user_id == user_id,
                func.trim(ContentItem.collection_name) == collection_name
            ).all()
            return content_items
        except Exception as e:
            logger.error(f"Error retrieving content for collection {collection_name}: {str(e)}")
            return []

    def delete_content_by_collection(
        self,
        user_id: str,
        collection_name: str,
        db: Session
    ) -> bool:
        """Deletes all content items when a collection is deleted."""
        try:
            from sqlalchemy import func
            
            # Trim input parameter
            collection_name = collection_name.strip()
            
            # Delete all content items for the collection
            deleted_count = db.query(ContentItem).filter(
                ContentItem.user_id == user_id,
                func.trim(ContentItem.collection_name) == collection_name
            ).delete(synchronize_session=False)
            
            db.commit()
            logger.info(f"Deleted {deleted_count} content items from collection '{collection_name}' for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting content for collection {collection_name}: {str(e)}")
            return False

    def trim_all_collection_names(
        self,
        user_id: str,
        db: Session
    ) -> bool:
        """Trims whitespace from all collection_name fields for a user's content items."""
        try:
            from sqlalchemy import text
            
            # Update all content items to trim their collection_name
            result = db.execute(text("""
                UPDATE content_items 
                SET collection_name = TRIM(collection_name) 
                WHERE user_id = :user_id 
                AND collection_name != TRIM(collection_name)
            """), {'user_id': user_id})
            
            updated_count = result.rowcount
            db.commit()
            
            logger.info(f"Trimmed whitespace from {updated_count} content items for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error trimming collection names: {str(e)}")
            return False

