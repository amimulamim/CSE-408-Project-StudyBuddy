from typing import List, Dict, Any
import mimetypes
import requests
import fitz  # PyMuPDF for PDF processing

# Define globally to be importable by chatHelper.py
TEXT_EXTENSIONS = {
    ".txt", ".md", ".csv", ".py", ".js", ".ts", ".json", ".html", ".css",
    ".cpp", ".c", ".cc", ".h", ".hpp", ".java", ".cs", ".xml", ".yaml", ".yml",
    ".sh", ".bat", ".sql", ".go", ".rs", ".kt", ".swift", ".r", ".m", ".vb"
}

# Configuration for PDF processing
MAX_PDF_PAGES_AS_IMAGES = 20  # Max PDF pages to convert to images per PDF document
INCLUDE_PDF_TEXT_CONTENT = True
INCLUDE_PDF_PAGE_IMAGES = True


def fetch_file_bytes(url: str) -> bytes:
    """Fetches the content of a URL as bytes."""
    response = requests.get(url)
    response.raise_for_status()
    return response.content


def _process_pdf_data(pdf_bytes: bytes, pdf_url: str) -> List[Dict[str, Any]]:
    """
    Helper function to process PDF bytes.
    Extracts text and converts specified number of pages to images.
    """
    pdf_parts = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        # 1. Extract text from PDF if enabled
        if INCLUDE_PDF_TEXT_CONTENT:
            full_text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                full_text += page.get_text("text")
            if full_text.strip():
                pdf_parts.append({"text": f"[Text content from PDF: {pdf_url}]\n{full_text.strip()}"})
            else:
                pdf_parts.append({"text": f"[No text content extracted from PDF: {pdf_url}]"})

        # 2. Convert selected pages to images if enabled
        if INCLUDE_PDF_PAGE_IMAGES:
            for page_num in range(min(len(doc), MAX_PDF_PAGES_AS_IMAGES)):
                page = doc.load_page(page_num)
                # Render page to a pixmap (image)
                # You can adjust DPI for higher or lower resolution
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")  # Output as PNG bytes
                if img_bytes:
                    pdf_parts.append({
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": img_bytes
                        }
                    })
                    # Add a text part to indicate this is a page from the PDF
                    pdf_parts.append({"text": f"[Image of Page {page_num + 1} from PDF: {pdf_url}]"})


        doc.close()
    except Exception as e:
        pdf_parts.append({"text": f"[Error processing PDF {pdf_url}: {str(e)}]"})
    return pdf_parts


def prepare_gemini_parts(text: str, file_urls: List[str]) -> List[Dict[str, Any]]:
    parts = []
    if text:
        parts.append({"text": text})

    for url in file_urls:
        mime_type, _ = mimetypes.guess_type(url)
        mime_type = mime_type or "application/octet-stream"
        
        # Determine file extension for text/code file check
        try:
            file_name = url.split('/')[-1]
            extension = "." + file_name.split('.')[-1].lower() if '.' in file_name else ''
        except Exception:
            extension = '' # Fallback if URL parsing is tricky

        try:
            data = fetch_file_bytes(url)

            if mime_type.startswith("image/"):
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": data
                    }
                })
            elif mime_type == "application/pdf":
                pdf_processed_parts = _process_pdf_data(data, url)
                parts.extend(pdf_processed_parts)
            elif mime_type.startswith("text/") or extension in TEXT_EXTENSIONS:
                try:
                    file_content = data.decode("utf-8")
                    parts.append({
                        "text": f"[Content from file: {url}]\n{file_content}"
                    })
                except UnicodeDecodeError:
                    # Fallback for non-UTF-8 text files or provide a snippet
                    parts.append({"text": f"[Text-based file (non-UTF-8 or binary): {url}. Could not decode as UTF-8 text.]"})
                except Exception as e_decode:
                    parts.append({"text": f"[Error decoding text file {url}: {str(e_decode)}]"})

            else:
                parts.append({"text": f"[Unsupported file type ({mime_type}): {url}]"})
        except requests.exceptions.RequestException as e_fetch:
            parts.append({"text": f"[Failed to fetch file: {url}, error: {str(e_fetch)}]"})
        except Exception as e_general:
            parts.append({"text": f"[An unexpected error occurred with file: {url}, error: {str(e_general)}]"})
    return parts