from uuid import uuid4
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import UploadFile

from app.chat import model
from app.utils.file_upload import upload_to_firebase
from app.chat.utils.chatHelper import prepare_chat_context
from app.ai.chatFactory import get_chat_llm


def generate_default_chat_name() -> str:
    now = datetime.now()
    return f"Chat - {now.strftime('%Y-%m-%d %H:%M')}"


def parse_user_message(text: str, files: List[UploadFile]) -> dict:
    return {
        "role": "user",
        "text": text,
        "files": files or []
    }


def generate_assistant_response(chat_id: str, user_message: dict, model_type: str, db: Session):
    llm = get_chat_llm(model_type)
    context = prepare_chat_context(chat_id, db, user_message)
    return llm.send_message(context)


def save_chat_and_respond(
    db: Session,
    user_id: str,
    user_message: dict,
    ai_response,
    chat_id: Optional[str] = None
):
    from app.chat import db as chat_db

    if chat_id:
        chat_db.add_message(db, chat_id, "user", user_message["text"], user_message["files"])
        chat_db.add_message(db, chat_id, "assistant", ai_response.text, ai_response.files)
        return chat_id
    else:
        new_chat = chat_db.create_chat(db, user_id, generate_default_chat_name())
        chat_db.add_message(db, new_chat.id, "user", user_message["text"], user_message["files"])
        chat_db.add_message(db, new_chat.id, "assistant", ai_response.text, ai_response.files)
        return new_chat.id
