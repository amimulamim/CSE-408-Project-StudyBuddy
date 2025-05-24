from app.chat.db import get_chat
from app.chat.utils.geminiFormatter import fetch_image_bytes, prepare_gemini_parts
from app.chat import model as db_model
from app.chat import schema
from app.chat import service
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
import mimetypes

# --- Convert Chat History for Gemini (raw dicts only) ---
def prepare_chat_context(chat_id: UUID, db: Session) -> List[Dict[str, Any]]:
    chat = service.get_chat(db, chat_id)
    if not chat:
        return []

    messages = sorted(
        [msg for msg in chat.messages if msg.status == schema.StatusEnum.complete.value],
        key=lambda m: m.timestamp
    )[-20:]

    history = []
    for msg in messages:
        role = "user" if msg.role == schema.RoleEnum.user.value else "model"
        parts = []

        if msg.text:
            parts.append({"text": msg.text})

        for file_entry in msg.files:
            try:
                mime_type, _ = mimetypes.guess_type(file_entry.file_url)
                mime_type = mime_type or "application/octet-stream"
                data = fetch_image_bytes(file_entry.file_url)

                if mime_type.startswith("image/"):
                    parts.append({
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": data
                        }
                    })
                elif mime_type == "application/pdf":
                    parts.append({"text": f"[Document: {file_entry.file_url}]"})
                else:
                    parts.append({"text": f"[Unsupported file: {file_entry.file_url}]"})
            except Exception as e:
                parts.append({"text": f"[Failed to load: {file_entry.file_url}, error: {e}]"})
        history.append({"role": role, "parts": parts})

    return history

