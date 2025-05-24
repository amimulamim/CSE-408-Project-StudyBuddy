

from typing import List, Dict, Any
from uuid import UUID
import mimetypes
import requests

def fetch_image_bytes(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()
    return response.content

# --- Current Prompt Formatter (Part.from_bytes for images only) ---
def prepare_gemini_parts(text: str, file_urls: List[str]) -> List[Dict[str, Any]]:
    parts = []
    if text:
        parts.append({"text": text})  # ✅ Use dict

    for url in file_urls:
        mime_type, _ = mimetypes.guess_type(url)
        mime_type = mime_type or "application/octet-stream"
        try:
            data = fetch_image_bytes(url)
            if mime_type.startswith("image/"):
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": data
                    }
                })
            elif mime_type == "application/pdf":
                parts.append({"text": f"[Document: {url}]"})
            else:
                parts.append({"text": f"[Unsupported file: {url}]"})
        except Exception as e:
            parts.append({"text": f"[Failed to fetch file: {url}, error: {e}]"})
    return parts
