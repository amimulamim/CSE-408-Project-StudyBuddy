# app/chat/service.py

from sqlalchemy.orm import Session
from uuid import UUID
from app.chat import model, schema
from typing import List


def create_chat(user_id: str, name: str, db: Session) -> model.Chat:
    chat = model.Chat(name=name, user_id=user_id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_chat(chat_id: UUID, db: Session) -> model.Chat:
    return db.query(model.Chat).filter_by(id=chat_id).first()


def get_chats_by_user(user_id: str, db: Session) -> List[model.Chat]:
    return db.query(model.Chat).filter_by(user_id=user_id).order_by(model.Chat.created_at.desc()).all()


def delete_chat(chat_id: UUID, db: Session) -> bool:
    chat = get_chat(chat_id, db)
    if chat:
        db.delete(chat)
        db.commit()
        return True
    return False


def rename_chat(chat_id: UUID, new_name: str, db: Session) -> model.Chat:
    chat = get_chat(chat_id, db)
    if chat:
        chat.name = new_name
        db.commit()
        db.refresh(chat)
        return chat
    return None

def add_message(db: Session, chat_id, role, text, status):
    message = model.Message(chat_id=chat_id, role=role, text=text, status=status)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def add_files(db: Session, message_id: str, urls: list[str]):
    for url in urls:
        db.add(model.MessageFile(message_id=message_id, file_url=url))
    db.commit()
