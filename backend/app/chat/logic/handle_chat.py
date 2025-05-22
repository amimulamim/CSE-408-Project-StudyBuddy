from typing import List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.chat import service, model
from app.chat.llm.chatFactory import get_llm_instance
from app.chat.logic.formatter import format_gemini_prompt, parse_gemini_response
from app.chat.logic.helper import get_chat_context

def handle_chat_logic(
    user_id: str,
    text: str,
    files: List[UploadFile],
    chat_id: Optional[str],
    db: Session
) -> Tuple[str, str, str]:
    # Step 1: Create or fetch chat
    if chat_id:
        chat = service.get_chat(db, chat_id)
        if not chat:
            chat = service.create_chat(db, user_id)
    else:
        chat = service.create_chat(db, user_id)

    # Step 2: Save user message
    user_msg = service.add_message(
        db=db,
        chat_id=str(chat.id),
        role="user",
        text=text,
        file_objs=files
    )

    # Step 3: Prepare context
    context = get_chat_context(chat.id, db)
    prompt = format_gemini_prompt(context)

    # Step 4: Get assistant reply (Gemini now, later can switch)
    llm = get_llm_instance("gemini")  # You can support others via the factory
    reply = llm.send_message(user_message=text, context=prompt)

    # Step 5: Save assistant reply
    assistant_msg = service.add_message(
        db=db,
        chat_id=str(chat.id),
        role="assistant",
        text=reply
    )

    # Step 6: Return result
    return str(chat.id), str(user_msg.id), reply
