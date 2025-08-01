from uuid import uuid4
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import UploadFile, HTTPException

from app.utils.file_upload import upload_to_firebase
from app.chat.utils.chatHelper import prepare_chat_context
from app.ai.chatFactory import get_chat_llm
from app.chat import db as chat_db
from app.chat.model import Chat, Message



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

    if chat_id:
        chat_db.add_message(db, chat_id, "user", user_message["text"], user_message["files"])
        chat_db.add_message(db, chat_id, "assistant", ai_response.text, ai_response.files)
        return chat_id
    else:
        new_chat = chat_db.create_chat(db, user_id, generate_default_chat_name())
        chat_db.add_message(db, new_chat.id, "user", user_message["text"], user_message["files"])
        chat_db.add_message(db, new_chat.id, "assistant", ai_response.text, ai_response.files)
        return new_chat.id

def create_chat(db: Session, user_id: str, name: Optional[str] = None):

    if not name:
        name = generate_default_chat_name()

    chat = chat_db.create_chat(db, user_id, name)
    return chat
    

def get_chat(db: Session, chat_id: str):
    return chat_db.get_chat(db, chat_id)

def get_chat_of_user_or_404(db: Session, chat_id: str, user_id: str) -> Chat:
    chat = get_chat(db, chat_id)
    if not chat or chat.user_id != user_id:
        raise HTTPException(status_code=404, detail="Chat not found or unauthorized.")
    return chat





def add_message(
    db: Session,
    chat_id: str,
    role: str,
    text: str,
    status: str,
    files: Optional[List[UploadFile]] = None
) -> Message:
    # Step 1: Upload Files if provided
    uploaded_files = []
    if files:
        for file in files:
            file_url = upload_to_firebase(file)
            uploaded_files.append(file_url)

    # Step 2: Create Message with files using db layer
    if uploaded_files:
        message = chat_db.add_message_with_files(db, chat_id, role, text, status, uploaded_files)
    else:
        message = chat_db.add_message(db, chat_id, role, text, status)
    
    return message, uploaded_files

def get_chats_by_user(db: Session, user_id: str):
    return chat_db.get_chats_by_user(db, user_id)

def get_chat_with_paginated_messages(db: Session, chat_id: str, user_id: str, offset: int, limit: int):
    chat = get_chat_of_user_or_404(db, chat_id, user_id)
    return chat_db.get_chat_with_paginated_messages(db, chat.id, offset, limit)


def rename_chat(chat_id: str, new_name: str, db: Session) -> Chat:
    return chat_db.rename_chat(chat_id, new_name, db)

def delete_chat(chat_id: str, db: Session):
    return chat_db.delete_chat(chat_id, db)

def get_latest_chats(db: Session, user_id: str):
    """
    Getting max 10 latest chats for a user
    """
    return chat_db.get_latest_chats(db, user_id)
