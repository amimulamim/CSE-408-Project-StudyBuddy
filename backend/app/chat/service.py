from uuid import uuid4
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import UploadFile

from app.chat import model
from app.utils.file_upload import upload_to_firebase
from app.chat.utils.chatHelper import prepare_chat_context
from app.ai.chatFactory import get_chat_llm
from app.chat import db as chat_db
from app.chat.model import Chat, Message, MessageFile



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


def add_message(
    db: Session,
    chat_id: str,
    role: str,
    text: str,
    status: str,
    files: Optional[List[UploadFile]] = None
) -> Message:
    # Step 1: Create Message
    message = Message(chat_id=chat_id, role=role, text=text, status=status)
    db.add(message)
    db.flush()  # Ensure message.id is available

    uploaded_files = []

    # Step 2: Upload Files and Associate
    if files:
        for file in files:
            file_url = upload_to_firebase(file)
            # file_url= 'gs://'+file_url
            message_file = MessageFile(message_id=message.id, file_url=file_url)
            db.add(message_file)
            # uploaded_files.append('gs://'+file_url)
            uploaded_files.append(file_url)

    # Step 3: Commit
    db.commit()
    db.refresh(message)
    return message, uploaded_files


