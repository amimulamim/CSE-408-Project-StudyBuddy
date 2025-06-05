def is_image_url(url: str) -> bool:
    return url.lower().endswith((".png", ".jpg", ".jpeg"))

def is_pdf_url(url: str) -> bool:
    return url.lower().endswith(".pdf")
