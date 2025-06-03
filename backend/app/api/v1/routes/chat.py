
from datetime import datetime
from typing import List, Optional,  Dict, Any
from uuid import UUID

from app.ai.chatFactory import get_chat_llm

from fastapi import APIRouter, Depends, HTTPException,  Form, UploadFile, File , Query, Path,Body
from sqlalchemy.orm import Session



from app.chat import service, schema
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user
from app.chat.utils.geminiFormatter import  prepare_gemini_parts
from app.chat.utils.chatHelper import prepare_chat_context



router = APIRouter()




@router.post("/", response_model=schema.ChatOut)
async def create_or_continue_chat(
    text: str = Form(""),
    files: Optional[List[UploadFile]] = File(None),
    chatId: Optional[UUID] = Form(None),
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not text and not files:
        raise HTTPException(
            status_code=400, detail="Message must include text or files."
        )

    user_id = user_info["uid"]
    user_message_db = None

    try:
        # Step 1: Create or fetch user's chat
        if chatId:
            current_chat = service.get_chat_of_user_or_404(db, chatId, user_id)
        else:
            chat_name = f"Chat with StudyBuddy- {datetime.now():%Y-%m-%d %H:%M}"
            current_chat = service.create_chat(db, user_id=user_id, name=chat_name)

        # Step 2: Save user message and uploaded files
        user_message_db, uploaded_file_urls = service.add_message(
            db,
            chat_id=current_chat.id,
            role=schema.RoleEnum.user,
            text=text,
            status=schema.StatusEnum.complete,
            files=files,
        )
        db.refresh(current_chat)

        # Step 3: Format history and current prompt
        gemini_history = prepare_chat_context(current_chat.id, db)
        current_prompt_parts = prepare_gemini_parts(text=text, file_urls=uploaded_file_urls)

        # Step 4: AI response
        llm = get_chat_llm()
        ai_response = await llm.send_message(current_prompt_parts, gemini_history)

        # Step 5: Save assistant message
        service.add_message(
            db,
            chat_id=current_chat.id,
            role=schema.RoleEnum.assistant,
            text=ai_response.text,
            status=schema.StatusEnum.complete,
            files=None,
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

        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )



@router.get("/list", response_model=schema.ChatListResponse )
def list_chats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    chats = service.get_chats_by_user(db,user["uid"])
    return {"chats": [{"id":str( c.id), "name": c.name} for c in chats]}



@router.get("/{chat_id}", response_model=schema.ChatPaginatedOut )
def get_chat_messages(
    chat_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    return service.get_chat_with_paginated_messages(db, chat_id, user_info["uid"], offset, limit)

@router.delete("/{chat_id}")
def delete_chat(
    chat_id: UUID = Path(...),
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user),
):
    # Secure check
    _ = service.get_chat_of_user_or_404(db, chat_id, user_info["uid"])

    # Proceed with deletion
    service.delete_chat(chat_id, db)
    return {"message": "Chat deleted", "chatId": str(chat_id)}



@router.patch("/{chat_id}/rename")
def rename_chat(
    chat_id: UUID,
    body: Dict = Body(...),
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user),
):
    new_name = body.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="Name is required")

    # Secure fetch
    chat = service.get_chat_of_user_or_404(db, chat_id, user_info["uid"])

    # Rename operation
    renamed = service.rename_chat(chat_id, new_name, db)
    return {"_id": str(renamed.id), "name": renamed.name}

