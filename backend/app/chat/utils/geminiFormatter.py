# app/chat/utils/geminiFormatter.py

from typing import List


def format_messages_for_gemini(messages: List) -> List[dict]:
    """
    Convert SQLAlchemy Message objects into dicts for Gemini.
    """
    formatted = []
    for msg in messages:
        formatted.append({
            "role": msg.role,
            "text": msg.text,
            "files": [f.file_url for f in msg.files]
        })
    return format_gemini_input(formatted)


# def format_gemini_input(messages: List[dict]) -> List[dict]:
#     """
#     Format messages for Gemini's chat.send_message()
#     Expected output: list of dicts with `role` and `parts`
#     """
#     formatted = []

#     for msg in messages:
#         parts = []

#         # Add text if exists
#         if msg.get("text"):
#             parts.append({"text": msg["text"]})

#         # Add each file as file_data
#         for file_url in msg.get("files", []):
#             if file_url.endswith(".pdf"):
#                 parts.append({
#                     "file_data": {
#                         "mime_type": "application/pdf",
#                         "file_uri": file_url
#                     }
#                 })
#             else:
#                 parts.append({
#                     "file_data": {
#                         "mime_type": "image/png",  # You can use mimetypes.guess_type() here optionally
#                         "file_uri": file_url
#                     }
#                 })

#         # Final Gemini message format
#         formatted.append({
#             "role": msg["role"],
#             "parts": parts
#         })

#     return formatted
def format_gemini_input(messages: list[dict]) -> list[dict]:
    formatted = []
    for msg in messages:
        parts = []
        if msg.get("text"):
            parts.append(msg["text"])

        for file_url in msg.get("files", []):
            parts.append({
                "file_data": {
                    "mime_type": "application/pdf" if file_url.endswith(".pdf") else "image/png",
                    "file_uri": file_url
                }
            })

        formatted.append({
            "role": msg["role"],
            "parts": parts
        })

    return formatted

