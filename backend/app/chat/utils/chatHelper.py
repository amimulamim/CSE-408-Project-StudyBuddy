from app.chat.db import get_chat
from app.chat.utils.geminiFormatter import format_messages_for_gemini

def prepare_chat_context(chat_id: str, db) -> list:
    chat = get_chat(db, chat_id)
    if not chat:
        return []
    # Extract last 20 messages
    messages = chat.messages[-10:]
    return format_messages_for_gemini(messages)
