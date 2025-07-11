import pytest
import json
import asyncio
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime, timezone

from app.content_generator.content_generator import ContentGenerator
from app.content_generator.models import ContentItem
from app.core.config import settings


class TestContentGenerator:
    """Test content generator service functions"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def sample_documents(self):
        """Sample documents for testing"""
        return [
            {"content": "Python is a high-level, interpreted programming language with dynamic semantics. Its high-level built in data structures, combined with dynamic typing and dynamic binding, make it very attractive for Rapid Application Development, as well as for use as a scripting or glue language to connect existing components together. Python's simple, easy to learn syntax emphasizes readability and therefore reduces the cost of program maintenance. Python supports modules and packages, which encourages program modularity and code reuse."},
            {"content": "Variables in Python are used to store data values. Unlike other programming languages, Python has no command for declaring a variable. A variable is created the moment you first assign a value to it. Variables do not need to be declared with any particular type, and can even change type after they have been set. Python variables are case-sensitive, meaning that age, Age and AGE are three different variables."},
            {"content": "Functions are reusable blocks of code that perform specific tasks. In Python, functions are defined using the def keyword, followed by the function name and parentheses containing any parameters. Functions help break our program into smaller and modular chunks, making it organized and manageable. Functions also help in code reusability and reduce redundancy. A function can return a value using the return statement."}
        ]

    @pytest.fixture
    def insufficient_documents(self):
        """Sample documents with insufficient content for testing"""
        return [
            {"content": "Python is a programming language used for web development."},
            {"content": "Variables in Python store data values."},
            {"content": "Functions are reusable blocks of code."}
        ]

    @pytest.fixture
    def sample_flashcards(self):
        """Sample flashcards response"""
        return [
            {"front": "What is Python?", "back": "A programming language"},
            {"front": "What are variables?", "back": "Data storage containers"},
            {"front": "What are functions?", "back": "Reusable code blocks"}
        ]

    @pytest.fixture
    def sample_latex_response(self):
        """Sample LaTeX response"""
        return """\\begin{document}
\\frame{\\frametitle{Introduction} \\begin{itemize} \\item Python basics \\end{itemize}}
\\frame{\\frametitle{Variables} \\begin{itemize} \\item Store data values \\end{itemize}}
\\end{document}"""

    @pytest.fixture
    def mock_gemini_response(self):
        """Mock Gemini API response"""
        response = Mock()
        response.text = """```json
[
    {"front": "What is Python?", "back": "A programming language"},
    {"front": "What are variables?", "back": "Data storage containers"}
]
```"""
        return response

    @pytest.fixture
    def mock_gemini_slides_response(self):
        """Mock Gemini API response for slides"""
        response = Mock()
        response.text = """\\begin{document}
\\frame{\\frametitle{Introduction} \\begin{itemize} \\item Python basics \\end{itemize}}
\\end{document}"""
        return response

    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    def test_init_success(self, mock_doc_service, mock_gen_model, mock_configure):
        """Test successful initialization of ContentGenerator"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance

        # Act
        generator = ContentGenerator()

        # Assert
        mock_configure.assert_called_once_with(api_key=settings.GEMINI_API_KEY)
        mock_gen_model.assert_called_once_with('gemini-1.5-pro')
        assert generator.model == mock_model_instance
        assert generator.document_service == mock_doc_service_instance

    @patch('app.content_generator.content_generator.genai.configure')
    def test_init_failure(self, mock_configure):
        """Test initialization failure of ContentGenerator"""
        # Arrange
        mock_configure.side_effect = Exception("API key error")

        # Act & Assert
        with pytest.raises(Exception):
            ContentGenerator()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('firebase_admin.storage.bucket')
    async def test_generate_and_store_content_flashcards_success(
        self, mock_bucket, mock_doc_service, mock_gen_model, mock_configure, 
        mock_db, sample_documents, sample_flashcards
    ):
        """Test successful generation and storage of flashcards"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance
        mock_doc_service_instance.search_documents = AsyncMock(return_value=sample_documents)

        mock_bucket_instance = Mock()
        mock_bucket.return_value = mock_bucket_instance
        mock_blob = Mock()
        mock_bucket_instance.blob.return_value = mock_blob
        mock_blob.public_url = "https://example.com/content.json"

        generator = ContentGenerator()
        generator._generate_flashcards = AsyncMock(return_value=sample_flashcards)

        # Act
        await generator.generate_and_store_content(
            content_id="test-id",
            user_id="test-user",
            content_type="flashcards",
            topic="Python Programming",
            difficulty="beginner",
            length="short",
            tone="educational",
            collection_name="test-collection",
            full_collection_name="test-collection",
            db=mock_db
        )

        # Assert
        mock_doc_service_instance.search_documents.assert_called_once_with(
            query="Python Programming",
            user_id="test-user",
            collection_name="test-collection",
            limit=5
        )
        generator._generate_flashcards.assert_called_once()
        mock_bucket_instance.blob.assert_called_once()
        mock_blob.upload_from_string.assert_called_once()
        mock_blob.make_public.assert_called_once()
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('firebase_admin.storage.bucket')
    async def test_generate_and_store_content_slides_success(
        self, mock_bucket, mock_doc_service, mock_gen_model, mock_configure,
        mock_db, sample_documents
    ):
        """Test successful generation and storage of slides"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance
        mock_doc_service_instance.search_documents = AsyncMock(return_value=sample_documents)

        mock_bucket_instance = Mock()
        mock_bucket.return_value = mock_bucket_instance
        mock_blob = Mock()
        mock_bucket_instance.blob.return_value = mock_blob
        mock_blob.public_url = "https://example.com/content.pdf"

        generator = ContentGenerator()
        pdf_bytes = b"mock pdf content"
        latex_source = "\\documentclass{beamer}\\begin{document}\\end{document}"
        generator._generate_slides = AsyncMock(return_value=(pdf_bytes, latex_source))

        # Act
        await generator.generate_and_store_content(
            content_id="test-id",
            user_id="test-user",
            content_type="slides",
            topic="Python Programming",
            difficulty="beginner",
            length="short",
            tone="educational",
            collection_name="test-collection",
            full_collection_name="test-collection",
            db=mock_db
        )

        # Assert
        mock_doc_service_instance.search_documents.assert_called_once()
        generator._generate_slides.assert_called_once()
        assert mock_bucket_instance.blob.call_count == 2  # PDF and LaTeX
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    async def test_generate_and_store_content_no_documents_found(
        self, mock_doc_service, mock_gen_model, mock_configure, mock_db
    ):
        """Test handling when no relevant documents are found"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance
        mock_doc_service_instance.search_documents = AsyncMock(return_value=[])

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(ValueError, match="No relevant documents found"):
            await generator.generate_and_store_content(
                content_id="test-id",
                user_id="test-user",
                content_type="flashcards",
                topic="Python Programming",
                difficulty="beginner",
                length="short",
                tone="educational",
                collection_name="test-collection",
                full_collection_name="test-collection",
                db=mock_db
            )

        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    async def test_generate_and_store_content_insufficient_content(
        self, mock_doc_service, mock_gen_model, mock_configure, mock_db, insufficient_documents
    ):
        """Test handling when insufficient content is available"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance
        mock_doc_service_instance.search_documents = AsyncMock(return_value=insufficient_documents)

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(ValueError, match="Insufficient content available for meaningful slide generation"):
            await generator.generate_and_store_content(
                content_id="test-id",
                user_id="test-user",
                content_type="flashcards",
                topic="Python Programming",
                difficulty="beginner",
                length="short",
                tone="educational",
                collection_name="test-collection",
                full_collection_name="test-collection",
                db=mock_db
            )

        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    async def test_generate_and_store_content_invalid_content_type(
        self, mock_doc_service, mock_gen_model, mock_configure, mock_db, sample_documents
    ):
        """Test handling of invalid content type"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_doc_service_instance = Mock()
        mock_doc_service.return_value = mock_doc_service_instance
        mock_doc_service_instance.search_documents = AsyncMock(return_value=sample_documents)

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(ValueError, match="Unsupported content type"):
            await generator.generate_and_store_content(
                content_id="test-id",
                user_id="test-user",
                content_type="invalid_type",
                topic="Python Programming",
                difficulty="beginner",
                length="short",
                tone="educational",
                collection_name="test-collection",
                full_collection_name="test-collection",
                db=mock_db
            )

        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_flashcards_success(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure,
        mock_gemini_response, sample_flashcards
    ):
        """Test successful flashcard generation"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_to_thread.return_value = mock_gemini_response

        generator = ContentGenerator()

        # Act
        result = await generator._generate_flashcards(
            context="Python is a programming language",
            topic="Python",
            difficulty="beginner",
            length="short",
            tone="educational"
        )

        # Assert
        mock_to_thread.assert_called_once()
        assert len(result) == 2
        assert result[0]["front"] == "What is Python?"
        assert result[0]["back"] == "A programming language"

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_flashcards_no_response(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure
    ):
        """Test flashcard generation with no response from API"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_response = Mock()
        mock_response.text = None
        mock_to_thread.return_value = mock_response

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(Exception, match="Error generating flashcards"):
            await generator._generate_flashcards(
                context="Python is a programming language",
                topic="Python",
                difficulty="beginner",
                length="short",
                tone="educational"
            )

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_flashcards_invalid_json(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure
    ):
        """Test flashcard generation with invalid JSON response"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_response = Mock()
        mock_response.text = "invalid json"
        mock_to_thread.return_value = mock_response

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(Exception, match="Error generating flashcards"):
            await generator._generate_flashcards(
                context="Python is a programming language",
                topic="Python",
                difficulty="beginner",
                length="short",
                tone="educational"
            )

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    @patch('subprocess.run')
    @patch('tempfile.TemporaryDirectory')
    @patch('builtins.open', create=True)
    @patch('os.path.exists')
    async def test_generate_slides_success(
        self, mock_exists, mock_open, mock_tempdir, mock_subprocess, mock_to_thread,
        mock_doc_service, mock_gen_model, mock_configure, mock_gemini_slides_response
    ):
        """Test successful slide generation"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_to_thread.side_effect = [
            mock_gemini_slides_response,  # First call for Gemini API
            Mock(returncode=0, stderr=Mock(decode=Mock(return_value="Success")))  # Second call for subprocess
        ]

        # Mock temporary directory
        mock_temp_context = Mock()
        mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
        mock_temp_context.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_temp_context

        # Mock successful compilation
        mock_process = Mock()
        mock_process.returncode = 0
        mock_subprocess.return_value = mock_process
        mock_exists.return_value = True

        # Mock file operations
        mock_file_context = Mock()
        mock_file_context.__enter__ = Mock()
        mock_file_context.__exit__ = Mock()
        mock_open.return_value = mock_file_context

        # Mock PDF reading
        def mock_open_side_effect(path, mode="r", encoding=None):
            if "slides.pdf" in path and "rb" in mode:
                mock_pdf_file = Mock()
                mock_pdf_file.__enter__ = Mock(return_value=Mock(read=Mock(return_value=b"mock pdf")))
                mock_pdf_file.__exit__ = Mock()
                return mock_pdf_file
            return mock_file_context

        mock_open.side_effect = mock_open_side_effect

        generator = ContentGenerator()

        # Act
        result = await generator._generate_slides(
            context="Python is a programming language",
            topic="Python",
            difficulty="beginner",
            length="short",
            tone="educational",
            return_latex=True
        )

        # Assert
        assert mock_to_thread.call_count >= 1  # At least one call to Gemini
        assert result[0] == b"mock pdf"  # PDF bytes
        assert "\\begin{document}" in result[1]  # LaTeX source

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    @patch('subprocess.run')
    @patch('tempfile.TemporaryDirectory')
    async def test_generate_slides_compilation_failure(
        self, mock_tempdir, mock_subprocess, mock_to_thread,
        mock_doc_service, mock_gen_model, mock_configure, mock_gemini_slides_response
    ):
        """Test slide generation with compilation failure"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_to_thread.return_value = mock_gemini_slides_response

        # Mock temporary directory
        mock_temp_context = Mock()
        mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
        mock_temp_context.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_temp_context

        # Mock failed compilation
        mock_process = Mock()
        mock_process.returncode = 1
        mock_process.stderr.decode.return_value = "LaTeX compilation error"
        mock_subprocess.return_value = mock_process

        generator = ContentGenerator()

        # Act
        result = await generator._generate_slides(
            context="Python is a programming language",
            topic="Python",
            difficulty="beginner",
            length="short",
            tone="educational",
            max_retries=1,
            return_latex=True
        )

        # Assert
        assert result[0] is None  # No PDF
        assert "\\begin{document}" in result[1]  # LaTeX source returned for moderation

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_slides_no_response(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure
    ):
        """Test slide generation with no response from API"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        mock_response = Mock()
        mock_response.text = None
        mock_to_thread.return_value = mock_response

        generator = ContentGenerator()

        # Act & Assert
        with pytest.raises(Exception, match="Failed to generate valid slides"):
            await generator._generate_slides(
                context="Python is a programming language",
                topic="Python",
                difficulty="beginner",
                length="short",
                tone="educational",
                max_retries=1
            )

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_slides_different_lengths(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure,
        mock_gemini_slides_response
    ):
        """Test slide generation with different length parameters"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        
        # Create different responses for each length
        def create_response(slides_count):
            response = Mock()
            response.text = f"\\begin{{document}}\\frame{{slides: {slides_count}}}\\end{{document}}"
            return response

        mock_to_thread.side_effect = [
            # Gemini calls for each length test
            create_response("5"),   # short
            Mock(returncode=1, stderr=Mock(decode=Mock(return_value="error"))),     # subprocess failure
            create_response("10"),  # medium
            Mock(returncode=1, stderr=Mock(decode=Mock(return_value="error"))),     # subprocess failure  
            create_response("15"),  # long
            Mock(returncode=1, stderr=Mock(decode=Mock(return_value="error"))),     # subprocess failure
        ]

        generator = ContentGenerator()

        # Test short length
        result_short = await generator._generate_slides(
            context="test",
            topic="test",
            difficulty="beginner",
            length="short",
            tone="educational",
            max_retries=1,
            return_latex=True
        )

        # Test medium length
        result_medium = await generator._generate_slides(
            context="test",
            topic="test",
            difficulty="beginner",
            length="medium",
            tone="educational",
            max_retries=1,
            return_latex=True
        )

        # Test long length
        result_long = await generator._generate_slides(
            context="test",
            topic="test",
            difficulty="beginner",
            length="long",
            tone="educational",
            max_retries=1,
            return_latex=True
        )

        # Assert that different content is generated based on length
        # Since compilation fails, PDF should be None and LaTeX should contain different slide counts
        assert result_short[0] is None  # PDF is None due to compilation failure
        assert "5" in result_short[1]   # LaTeX source contains "5" 
        
        assert result_medium[0] is None  # PDF is None due to compilation failure
        assert "10" in result_medium[1]  # LaTeX source contains "10"
        
        assert result_long[0] is None   # PDF is None due to compilation failure
        assert "15" in result_long[1]   # LaTeX source contains "15"

    @pytest.mark.asyncio
    @patch('app.content_generator.content_generator.genai.configure')
    @patch('app.content_generator.content_generator.genai.GenerativeModel')
    @patch('app.content_generator.content_generator.DocumentService')
    @patch('asyncio.to_thread')
    async def test_generate_flashcards_different_lengths(
        self, mock_to_thread, mock_doc_service, mock_gen_model, mock_configure
    ):
        """Test flashcard generation with different length parameters"""
        # Arrange
        mock_model_instance = Mock()
        mock_gen_model.return_value = mock_model_instance
        
        def mock_response_factory(num_cards):
            response = Mock()
            cards = [{"front": f"Q{i}", "back": f"A{i}"} for i in range(num_cards)]
            response.text = f"```json\n{json.dumps(cards)}\n```"
            return response

        mock_to_thread.side_effect = [
            mock_response_factory(5),   # short
            mock_response_factory(10),  # medium
            mock_response_factory(15)   # long
        ]

        generator = ContentGenerator()

        # Test different lengths
        short_result = await generator._generate_flashcards("test", "test", "beginner", "short", "educational")
        medium_result = await generator._generate_flashcards("test", "test", "beginner", "medium", "educational")
        long_result = await generator._generate_flashcards("test", "test", "beginner", "long", "educational")

        # Assert correct number of flashcards
        assert len(short_result) == 5
        assert len(medium_result) == 10
        assert len(long_result) == 15
