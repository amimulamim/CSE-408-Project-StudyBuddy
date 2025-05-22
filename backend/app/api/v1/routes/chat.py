# app/chat/router.py

from app.chat import db
from fastapi import APIRouter, Depends, HTTPException, Path, Body, Form, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID

from app.chat import service, schema
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user

router = APIRouter()


@router.get("/ai/chat/list", response_model=schema.ChatListResponse)
def list_chats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    chats = db.get_chats_by_user(user.uid, db)
    return {"chats": [{"_id": c.id, "name": c.name} for c in chats]}


@router.get("/ai/chat/{chat_id}", response_model=schema.ChatOut)
def get_chat(chat_id: UUID = Path(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    chat = db.get_chat(chat_id, db)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@router.delete("/ai/chat/{chat_id}")
def delete_chat(chat_id: UUID = Path(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    chat = db.get_chat(chat_id, db)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete_chat(chat_id, db)
    return {"message": "Chat deleted", "chatId": str(chat_id)}


@router.patch("/ai/chat/{chat_id}/rename")
def rename_chat(
    chat_id: UUID,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    new_name = body.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="Name is required")
    chat = db.rename_chat(chat_id, new_name, db)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"_id": str(chat.id), "name": chat.name}


@router.post("/ai/chat", response_model=schema.MessageOut, tags=["Chat"])
def create_or_continue_chat(
    text: str = Form(""),
    files: list[UploadFile] = File([]),
    chatId: str = Form(None),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not text and not files:
        raise HTTPException(status_code=400, detail="Message must have text or file")

    chat = service.get_chat(db, chatId) if chatId else service.create_chat(db, user_id)
    user_msg = service.add_message(db, chat.id, "user", text, files)

    context = prepare_chat_context(chat, db)
    llm = get_chat_llm("gemini")
    ai_response = llm.send_message(context + [{"role": "user", "text": text}], files)

    assistant_msg = service.add_message(db, chat.id, "assistant", ai_response.text, ai_response.files)

    return {
        "chatId": chat.id,
        "messages": [
            {"role": "user", "text": user_msg.text},
            {"role": "assistant", "text": assistant_msg.text}
        ]
    }