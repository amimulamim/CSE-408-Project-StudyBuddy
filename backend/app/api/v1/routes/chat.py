import os
import requests
import mimetypes
from datetime import datetime
from typing import List, Optional, Union, Dict, Any
from uuid import UUID

from app.ai.chatFactory import get_chat_llm

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Form, UploadFile, File, status
from sqlalchemy.orm import Session

import google.generativeai as genai
from google.genai.types import Part

from app.chat import service, schema
from app.chat import model as db_model
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user

router = APIRouter()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")
genai.configure(api_key=GEMINI_API_KEY)

# --- Fetch Firebase Image Bytes ---
def fetch_image_bytes(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()
    return response.content

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

# --- Current Prompt Formatter (Part.from_bytes for images only) ---
def prepare_gemini_parts(text: str, file_urls: List[str]) -> List[Dict[str, Any]]:
    parts = []
    if text:
        parts.append({"text": text})  # ✅ Use dict

    for url in file_urls:
        mime_type, _ = mimetypes.guess_type(url)
        mime_type = mime_type or "application/octet-stream"
        try:
            data = fetch_image_bytes(url)
            if mime_type.startswith("image/"):
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": data
                    }
                })
            elif mime_type == "application/pdf":
                parts.append({"text": f"[Document: {url}]"})
            else:
                parts.append({"text": f"[Unsupported file: {url}]"})
        except Exception as e:
            parts.append({"text": f"[Failed to fetch file: {url}, error: {e}]"})
    return parts

# # --- Gemini Chat Client ---
# class GeminiLLM:
#     async def send_message(self, current_prompt_parts: List[Union[str, Part]], history: List[Dict[str, Any]] = None):
#         model_name = "gemini-pro-vision" if any(isinstance(p, Part) for p in current_prompt_parts) else "gemini-2.0-flash"
#         model = genai.GenerativeModel(model_name=model_name)
#         convo = model.start_chat(history=history or [])
#         try:
#             response = await convo.send_message_async(current_prompt_parts)
#             return response
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"AI communication error: {e}")

# _llm_instance: Optional[GeminiLLM] = None
# def get_chat_llm() -> GeminiLLM:
#     global _llm_instance
#     if not _llm_instance:
#         _llm_instance = GeminiLLM()
#     return _llm_instance

# --- Main Chat Endpoint ---
@router.post("/ai/chat", response_model=schema.ChatOut, tags=["Chat"])
async def create_or_continue_chat(
    text: str = Form(""),
    files: Optional[List[UploadFile]] = File(None),
    chatId: Optional[UUID] = Form(None),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not text and not files:
        raise HTTPException(status_code=400, detail="Message must include text or files.")

    user_id = user_info["uid"]
    user_message_db = None

    try:
        # Step 1: Chat session
        current_chat = service.get_chat(db, chatId) if chatId else service.create_chat(
            db, user_id=user_id, name=f"Chat with Gemini - {datetime.now():%Y-%m-%d %H:%M}"
        )
        if not current_chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        # Step 2: Store user message and upload files
        user_message_db, uploaded_file_urls = service.add_message(
            db, chat_id=current_chat.id, role=schema.RoleEnum.user,
            text=text, status=schema.StatusEnum.complete, files=files
        )
        db.refresh(current_chat)

        # Step 3: Format history and current prompt
        gemini_history = prepare_chat_context(current_chat.id, db)
        current_prompt_parts = prepare_gemini_parts(text=text, file_urls=uploaded_file_urls)

        # Step 4: Send to Gemini
        llm = get_chat_llm()
        ai_response = await llm.send_message(current_prompt_parts, gemini_history)

        # Step 5: Store assistant reply
        service.add_message(
            db, chat_id=current_chat.id, role=schema.RoleEnum.assistant,
            text=ai_response.text, status=schema.StatusEnum.complete, files=None
        )

        db.refresh(current_chat)
        return current_chat

    except Exception as e:
        import traceback
        traceback.print_exc()
        if user_message_db:
            user_message_db.status = schema.StatusEnum.failed.value
            db.add(user_message_db)
            db.commit()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
