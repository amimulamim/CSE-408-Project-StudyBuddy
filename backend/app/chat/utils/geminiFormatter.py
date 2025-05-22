def format_gemini_input(messages: list[dict]) -> list:
    formatted = []

    for msg in messages:
        content = []
        if msg.get("text"):
            content.append({"text": msg["text"]})
        for file_url in msg.get("files", []):
            if file_url.endswith(".pdf"):
                content.append({"file_data": {"file_url": file_url}})
            else:
                content.append({"inline_data": {"mime_type": "image/*", "file_url": file_url}})

        formatted.append({
            "role": msg["role"],
            "parts": content
        })

    return formatted
