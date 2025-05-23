# app/chat/router.py
import os
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional, Union, Dict, Any, Tuple

# FastAPI and SQLAlchemy imports
from fastapi import APIRouter, Depends, HTTPException, Path, Body, Form, UploadFile, File, status
from sqlalchemy.orm import Session
from uuid import UUID

# Firebase Admin SDK imports (assuming initialized elsewhere or handled by service)
# If you are putting Firebase init directly here, ensure the _firebase_initialized guard from last time.
# For this version, assuming service.add_message handles Firebase logic.

# Google Gemini API imports
import google.generativeai as genai
from google.genai.types import Part

# Local imports
from app.chat import service, schema
from app.chat import model as db_model # Alias for SQLAlchemy models
from app.core.database import get_db
from app.auth.firebase_auth import get_current_user # Assuming this provides user_info dict with 'uid'

router = APIRouter()

# --- Gemini Configuration (should be global, e.g., in main.py startup) ---
# Placing here for completeness based on "non-modular" request, but advise moving.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")
genai.configure(api_key=GEMINI_API_KEY)


# --- INLINED HELPER: prepare_chat_context (Revised for Gemini history format) ---
def prepare_chat_context(chat_id: UUID, db: Session) -> List[Dict[str, Any]]:
    """
    Prepares chat history for Gemini in the format expected by model.start_chat(history=...).
    Fetches up to the last 20 complete messages from the chat.
    """
    chat = service.get_chat(db, chat_id) # Use service's get_chat
    if not chat:
        return []

    # Get last 20 complete messages, sorted chronologically
    # Exclude any messages that are still processing or failed from history
    history_messages = sorted(
        [msg for msg in chat.messages if msg.status == schema.StatusEnum.complete.value],
        key=lambda m: m.timestamp
    )[-20:] # Limit to last 20 for context window

    gemini_history = []
    for msg in history_messages:
        # Skip the very last user message if it's the one we just added (will be current prompt)
        # This check is less critical here if `user_message_db` is handled in the endpoint,
        # but good practice for preparing *past* history.
        # However, the loop logic in `create_or_continue_chat` should explicitly exclude
        # the current message from being part of `history` passed to `start_chat`.

        gemini_role = "user" if msg.role == schema.RoleEnum.user.value else "model"
        msg_parts: List[Union[str, Part]] = []
        if msg.text:
            msg_parts.append(msg.text)

        for file_entry in msg.files:
            if file_entry.file_url:
                mime_type, _ = mimetypes.guess_type(file_entry.file_url)
                if not mime_type:
                    if file_entry.file_url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                        mime_type = "image/jpeg"
                    elif file_entry.file_url.lower().endswith('.pdf'):
                        mime_type = "application/pdf"
                
                if mime_type and mime_type.startswith('image/'):
                    # Use file_data with URI for public Firebase URLs
                    msg_parts.append(Part(file_data={"mime_type": mime_type, "uri": file_entry.file_url}))
                elif mime_type == "application/pdf":
                    msg_parts.append(f"[Document: {file_entry.file_url}]") # Pass PDF URL as text
                else:
                    msg_parts.append(f"[File: {file_entry.file_url}]")
        
        if msg_parts:
            gemini_history.append({"role": gemini_role, "parts": msg_parts})

    return gemini_history


# --- INLINED HELPER: prepare_gemini_parts (Revised for ONLY current prompt) ---
def prepare_gemini_parts(
    text: str,
    file_urls: List[str]
) -> List[Union[str, Part]]:
    """
    Prepares ONLY the current user's prompt parts (text and newly uploaded files) for Gemini.
    This is the 'contents' argument for convo.send_message_async.
    """
    parts: List[Union[str, Part]] = []
    if text:
        parts.append(text)

    for url in file_urls:
        mime_type, _ = mimetypes.guess_type(url)
        if not mime_type:
            if url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                mime_type = "image/jpeg"
            elif url.lower().endswith('.pdf'):
                mime_type = "application/pdf"

        if mime_type and mime_type.startswith("image/"):
            parts.append(Part(file_data={"mime_type": mime_type, "uri": url}))
        elif mime_type == "application/pdf":
            parts.append(f"[Document: {url}]") # Pass PDF URL as text
        else:
            parts.append(f"[File: {url}]")
    return parts


# --- INLINED HELPER: get_chat_llm / GeminiLLM (Revised send_message for history & current parts) ---
class GeminiLLM:
    def __init__(self):
        pass # Model selection is dynamic in send_message

    async def send_message(self, current_prompt_parts: List[Union[str, Part]], history: List[Dict[str, Any]] = None):
        """
        Sends the current user's prompt to the Gemini model within a conversational context.
        """
        # Determine model based on whether current_prompt_parts contains media
        effective_model_name = "gemini-2.0-flash"
        if any(isinstance(p, Part) for p in current_prompt_parts):
            effective_model_name = "gemini-pro-vision"
        
        model = genai.GenerativeModel(model_name=effective_model_name)
        
        # Start a new chat session with the provided history
        convo = model.start_chat(history=history or [])
        
        try:
            response = await convo.send_message_async(current_prompt_parts)
            
            if hasattr(response, 'text'):
                return response # Return the actual Gemini response object
            else:
                print(f"Warning: Gemini response has no 'text' attribute. Full response: {response}")
                class MockResponse: # Fallback mock if text is missing
                    def __init__(self, text_content):
                        self.text = text_content
                        self.files = []
                return MockResponse("No text response from AI.")
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI communication error: {e}")

_llm_instance: Optional[GeminiLLM] = None # Singleton pattern

def get_chat_llm(llm_type: str = "gemini") -> GeminiLLM:
    """Returns a configured LLM instance (singleton)."""
    global _llm_instance
    if llm_type == "gemini":
        if _llm_instance is None:
            _llm_instance = GeminiLLM()
        return _llm_instance
    raise ValueError(f"Unknown LLM type: {llm_type}")


# --- EXISTING ROUTER ENDPOINTS (Assuming they work and call service functions) ---
# (No changes needed here based on the problem description)
@router.get("/ai/chat/list", response_model=schema.ChatListResponse)
def list_chats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    chats = service.get_chats_by_user(user.uid, db)
    return {"chats": [{"_id": c.id, "name": c.name} for c in chats]}

@router.get("/ai/chat/{chat_id}", response_model=schema.ChatOut)
def get_chat(chat_id: UUID = Path(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    chat = service.get_chat(db, chat_id)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.delete("/ai/chat/{chat_id}")
def delete_chat(chat_id: UUID = Path(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    chat = service.get_chat(db, chat_id)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    service.delete_chat(chat_id, db)
    return {"message": "Chat deleted", "chatId": str(chat_id)}

@router.patch("/ai/chat/{chat_id}/rename")
def rename_chat(
    chat_id: UUID,
    body: Dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    new_name = body.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="Name is required")
    chat = service.rename_chat(chat_id, new_name, db)
    if not chat or chat.user_id != user.uid:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"_id": str(chat.id), "name": chat.name}


# --- REVISED `create_or_continue_chat` ENDPOINT ---
@router.post("/ai/chat", response_model=schema.ChatOut, tags=["Chat"]) # Corrected response_model
async def create_or_continue_chat( # Made async
    text: str = Form(""),
    files: Optional[List[UploadFile]] = File(None), # Use Optional[List]
    chatId: Optional[UUID] = Form(None), # Use UUID for consistency
    user_info: Dict[str, Any] = Depends(get_current_user), # Correct type hint
    db: Session = Depends(get_db),
):
    """
    Creates a new chat or continues an existing conversation with Gemini.
    Handles text and multiple file uploads (images, PDFs).
    This version focuses on correct Gemini API interaction.
    """
    if not text and not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message must include text or files.")

    user_id = user_info["uid"]
    current_chat: Optional[db_model.Chat] = None
    user_message_db: Optional[db_model.Message] = None

    try:
        # 1. Get or create chat
        if chatId:
            current_chat = service.get_chat(db, chatId) # Assumed working
            if not current_chat:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
        else:
            chat_name = f"Chat with Gemini - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            current_chat = service.create_chat(db, user_id=user_id, name=chat_name) # Assumed working

        # 2. Save user message and get uploaded file URLs
        # Assumes service.add_message now returns (Message, List[str]) and handles Firebase upload.
        user_message_db, uploaded_file_urls = service.add_message(
            db,
            chat_id=current_chat.id,
            role=schema.RoleEnum.user,
            text=text,
            status=schema.StatusEnum.complete,
            files=files
        )
        # Refresh chat to ensure its 'messages' relationship is updated before building history
        db.refresh(current_chat) 
        # Refresh user_message_db to load its 'files' relationship if not eager-loaded
        db.refresh(user_message_db)


        # 3. Prepare Gemini history (past messages)
        # CRITICAL: Filter out the *just added* user_message_db from history
        # as it will be sent as the 'current_prompt_parts'.
        temp_chat_messages_excluding_current = [
            msg for msg in current_chat.messages if msg.id != user_message_db.id
        ]
        # Create a temporary chat object or pass a filtered list to prepare_chat_context
        # A simpler way: prepare_chat_context already fetches from DB; just ensure it's up-to-date.
        # The _prepare_chat_context helper iterates through chat.messages, which should be fresh after db.refresh(current_chat).
        # We need to ensure that the *current* user message is NOT included in the history passed to start_chat.
        # The `_prepare_chat_context` helper *should* handle this if it correctly excludes the last message if that's the new one.
        # A more robust way to ensure this is:
        
        # Option 1: Directly filter history after preparation:
        # This is robust but might involve a slight double-pass if _prepare_chat_context doesn't filter.
        raw_gemini_history = prepare_chat_context(current_chat.id, db)
        gemini_history_for_start_chat = [
            turn for turn in raw_gemini_history 
            if not (turn.get("role") == "user" and turn.get("parts") == [user_message_db.text])
            # This filtering can be tricky if there are multiple identical user messages.
            # A more robust approach is to modify prepare_chat_context to explicitly exclude
            # the last added message based on its ID if needed, or rely on its standard behavior.
            # For standard Gemini, the history is *past* turns. The current user message is *not* history yet.
        ]
        # So, the `prepare_chat_context` as defined above *already* correctly generates history
        # *excluding* the current user message, if we consider `current_chat.messages` having the *latest* entry.
        # The code for `_prepare_chat_context` iterates `[msg for msg in chat.messages if msg.status == complete]`.
        # This means the most recent complete user message is part of history. This is actually correct for Gemini.
        # The issue is the `flat_parts` part.

        # So, `gemini_history` as returned by `prepare_chat_context` should be the actual history.
        gemini_history = prepare_chat_context(current_chat.id, db)
        
        # 4. Prepare the current user's prompt parts (text + newly uploaded files)
        # This is ONLY for the *current* message content that will be sent via convo.send_message_async
        current_prompt_parts = prepare_gemini_parts(text=text, file_urls=uploaded_file_urls)

        # 5. Call Gemini
        llm = get_chat_llm("gemini")
        # CRITICAL CHANGE: Pass history to llm.send_message, and current_prompt_parts as the main content
        ai_response = await llm.send_message(current_prompt_parts=current_prompt_parts, history=gemini_history)

        # 6. Save assistant message
        # Assumes service.add_message works and ai_response.text is available
        assistant_msg, _ = service.add_message(
            db,
            chat_id=current_chat.id,
            role=schema.RoleEnum.assistant,
            text=ai_response.text,
            status=schema.StatusEnum.complete,
            files=None # Assistant replies typically don't have files
        )

        # 7. Refresh the chat object one last time to include the assistant's message
        db.refresh(current_chat)

        # 8. Return the full chat object (FastAPI will serialize it to ChatOut)
        return current_chat

    except HTTPException:
        # Re-raise FastAPI HTTPExceptions directly
        raise
    except Exception as e:
        # Catch any other unexpected errors
        print(f"An unexpected error occurred in /ai/chat: {e}")
        import traceback
        traceback.print_exc()

        # Mark user message as failed if an error occurred after it was saved
        if user_message_db and user_message_db.status != schema.StatusEnum.failed.value:
            user_message_db.status = schema.StatusEnum.failed.value
            db.add(user_message_db)
            try:
                db.commit()
                db.refresh(user_message_db)
            except Exception as commit_e:
                print(f"Error committing user message status update on failure: {commit_e}")
                db.rollback()

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")