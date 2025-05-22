from app.chat.db import get_chat
from app.chat.schema import RoleEnum
from app.chat.utils.geminiFormatter import format_gemini_input


def prepare_chat_context(chat_id: str, db, current_user_message: dict) -> list:
    chat = get_chat(db, chat_id)
    if not chat:
        return [current_user_message]

    messages = chat.messages[-20:]  # Last 20
    formatted = []
    for msg in messages:
        formatted.append({
            "role": msg.role,
            "text": msg.text,
            "files": [f.file_url for f in msg.files]
        })

    formatted.append(current_user_message)
    return format_gemini_input(formatted)
