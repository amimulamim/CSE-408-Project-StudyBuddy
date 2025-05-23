# # app/chat/utils/geminiFormatter.py

# from typing import List


# def format_messages_for_gemini(messages: List) -> List[dict]:
#     """
#     Convert SQLAlchemy Message objects into dicts for Gemini.
#     """
#     formatted = []
#     for msg in messages:
#         formatted.append({
#             "role": msg.role,
#             "text": msg.text,
#             "files": [f.file_url for f in msg.files]
#         })
#     return format_gemini_input(formatted)


# # def format_gemini_input(messages: List[dict]) -> List[dict]:
# #     """
# #     Format messages for Gemini's chat.send_message()
# #     Expected output: list of dicts with `role` and `parts`
# #     """
# #     formatted = []

# #     for msg in messages:
# #         parts = []

# #         # Add text if exists
# #         if msg.get("text"):
# #             parts.append({"text": msg["text"]})

# #         # Add each file as file_data
# #         for file_url in msg.get("files", []):
# #             if file_url.endswith(".pdf"):
# #                 parts.append({
# #                     "file_data": {
# #                         "mime_type": "application/pdf",
# #                         "file_uri": file_url
# #                     }
# #                 })
# #             else:
# #                 parts.append({
# #                     "file_data": {
# #                         "mime_type": "image/png",  # You can use mimetypes.guess_type() here optionally
# #                         "file_uri": file_url
# #                     }
# #                 })

# #         # Final Gemini message format
# #         formatted.append({
# #             "role": msg["role"],
# #             "parts": parts
# #         })

# #     return formatted
# def format_gemini_input(messages: list[dict]) -> list[dict]:
#     formatted = []
#     for msg in messages:
#         parts = []
#         if msg.get("text"):
#             parts.append(msg["text"])

#         for file_url in msg.get("files", []):
#             parts.append({
#                 "file_data": {
#                     "mime_type": "application/pdf" if file_url.endswith(".pdf") else "image/png",
#                     "file_uri": file_url
#                 }
#             })

#         formatted.append({
#             "role": msg["role"],
#             "parts": parts
#         })

#     return formatted


import requests
import google.generativeai as genai
from google import genai
from google.genai import types
def fetch_image_bytes(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()
    return response.content

def format_messages_for_gemini(messages: list) -> list[dict]:
    formatted = []
    for msg in messages:
        parts = []
        if msg.text:
            parts.append(msg.text)
        for file in msg.files:
            mime = "application/pdf" if file.file_url.endswith(".pdf") else "image/png"
            file_bytes = fetch_image_bytes(file.file_url)
            parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime))
        formatted.append({
            "role": msg.role,
            "parts": parts
        })
    return formatted


def prepare_gemini_parts(context: list, text: str = "", file_urls: list[str] = []) -> list[types.Part]:
    parts: list[types.Part] = []

    for item in context:
        if isinstance(item, str):
            parts.append(types.Part.from_text(item))

        elif isinstance(item, types.Part):
            parts.append(item)

        elif isinstance(item, dict) and "parts" in item:
            # Flatten parts from Gemini chat-style history
            for sub in item["parts"]:
                if isinstance(sub, str):
                    parts.append(types.Part.from_text(text=sub))
                elif isinstance(sub, types.Part):
                    parts.append(sub)
                else:
                    raise ValueError(f"Unsupported nested part type: {type(sub)}")


        else:
            raise ValueError(f"Unsupported context item type: {type(item)}")

    if text:
        parts.append(types.Part.from_text(text=text))

    for url in file_urls:
        mime = "application/pdf" if url.endswith(".pdf") else "image/png"
        data = fetch_image_bytes(url)
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))

    return parts