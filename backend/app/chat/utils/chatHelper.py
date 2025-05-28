from app.chat.db import get_chat # Assuming this import is correct
from app.chat.utils.geminiFormatter import TEXT_EXTENSIONS, fetch_file_bytes, _process_pdf_data # Import necessary items
from app.chat import model as db_model # Assuming this import is correct
from app.chat import schema # Assuming this import is correct
from app.chat import service # Assuming this import is correct
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
import mimetypes
import requests # Ensure requests is imported if used standalone here, though fetch_file_bytes uses it

# --- Convert Chat History for Gemini ---
def prepare_chat_context(chat_id: UUID, db: Session) -> List[Dict[str, Any]]:
    chat = service.get_chat(db, chat_id)
    if not chat:
        return []

    # Get the last 20 completed messages
    messages = sorted(
        [msg for msg in chat.messages if msg.status == schema.StatusEnum.complete.value],
        key=lambda m: m.timestamp
    )[-20:]

    history = []
    for msg in messages:
        role = "user" if msg.role == schema.RoleEnum.user.value else "model"
        msg_parts = []

        if msg.text:
            msg_parts.append({"text": msg.text})

        for file_entry in msg.files:
            file_url = file_entry.file_url
            mime_type, _ = mimetypes.guess_type(file_url)
            mime_type = mime_type or "application/octet-stream"

            # Determine file extension for text/code file check
            try:
                file_name_history = file_url.split('/')[-1]
                extension_history = "." + file_name_history.split('.')[-1].lower() if '.' in file_name_history else ''
            except Exception:
                extension_history = ''


            try:
                data = fetch_file_bytes(file_url) # Use the imported fetch_file_bytes

                if mime_type.startswith("image/"):
                    msg_parts.append({
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": data
                        }
                    })
                elif mime_type == "application/pdf":
                    # Use the imported _process_pdf_data helper for consistency
                    pdf_processed_parts = _process_pdf_data(data, file_url)
                    msg_parts.extend(pdf_processed_parts)
                elif mime_type.startswith("text/") or extension_history in TEXT_EXTENSIONS:
                    try:
                        file_content = data.decode("utf-8")
                        msg_parts.append({
                            "text": f"[Content from historical file: {file_url}]\n{file_content}"
                        })
                    except UnicodeDecodeError:
                        msg_parts.append({"text": f"[Historical text-based file (non-UTF-8 or binary): {file_url}. Could not decode.]"})
                    except Exception as e_decode_hist:
                        msg_parts.append({"text": f"[Error decoding historical text file {file_url}: {str(e_decode_hist)}]"})
                else:
                    msg_parts.append({"text": f"[Unsupported historical file type ({mime_type}): {file_url}]"})
            except requests.exceptions.RequestException as e_fetch_hist:
                msg_parts.append({"text": f"[Failed to load historical file: {file_url}, error: {str(e_fetch_hist)}]"})
            except Exception as e_general_hist:
                msg_parts.append({"text": f"[An unexpected error occurred with historical file: {file_url}, error: {str(e_general_hist)}]"})
        
        if msg_parts: # Only add message to history if it has parts (text or files)
            history.append({"role": role, "parts": msg_parts})

    return history