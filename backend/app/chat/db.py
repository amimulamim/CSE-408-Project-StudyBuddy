from sqlalchemy.orm import Session, selectinload
from app.chat import model
from typing import List, Optional
from sqlalchemy import select


def create_chat(db: Session, user_id: str, name: str ) -> model.Chat:
    chat = model.Chat(name=name, user_id=user_id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_chat(db: Session, chat_id) -> model.Chat:
    return db.query(model.Chat).filter_by(id=chat_id).first()


def get_chats_by_user(db: Session, user_id: str) -> List[model.Chat]:
    return db.query(model.Chat).filter_by(user_id=user_id).order_by(model.Chat.created_at.desc()).all()


def delete_chat(chat_id, db: Session) -> bool:
    chat = get_chat(db, chat_id)
    if chat:
        db.delete(chat)
        db.commit()
        return True
    return False


def rename_chat(chat_id, new_name: str, db: Session) -> model.Chat:
    chat = get_chat(db, chat_id)
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

def add_message_with_files(
    db: Session,
    chat_id: str,
    role: str,
    text: str,
    status: str,
    file_urls: Optional[List[str]] = None
) -> model.Message:
    """Add a message with associated files (already uploaded)"""
    # Step 1: Create Message
    message = model.Message(chat_id=chat_id, role=role, text=text, status=status)
    db.add(message)
    db.flush()  # Ensure message.id is available

    # Step 2: Associate Files
    if file_urls:
        for file_url in file_urls:
            message_file = model.MessageFile(message_id=message.id, file_url=file_url)
            db.add(message_file)

    # Step 3: Commit
    db.commit()
    db.refresh(message)
    return message

def get_chat_with_paginated_messages(db: Session, chat_id, offset: int, limit: int) -> model.Chat:
    """Get chat with paginated messages"""
    chat = get_chat(db, chat_id)
    if not chat:
        return None
    
    # Get paginated messages with file associations
    messages = (
        db.query(model.Message)
        .filter(model.Message.chat_id == chat_id)
        .order_by(model.Message.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(model.Message.files))
        .all()
    )

    chat.messages = messages  # override for paginated result
    return chat

def add_files(db: Session, message_id: str, urls: list[str]):
    for url in urls:
        db.add(model.MessageFile(message_id=message_id, file_url=url))
    db.commit()

def get_latest_chats(db: Session, user_id: str):
    """
    Getting max 10 latest chats for a user
    """
    return (
        db.query(model.Chat.id, model.Chat.name).
           where(model.Chat.user_id == user_id).
           order_by(model.Chat.created_at.desc()).
           limit(10)
    )