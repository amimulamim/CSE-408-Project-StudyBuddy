from firebase_admin import storage
import time
import uuid

def upload_to_firebase(file, folder="uploads"):
    """
    Upload a file to Firebase Storage and return the public URL.
    
    Args:
        file: UploadFile object from FastAPI
        folder: Folder name in storage bucket (default: "uploads")
    
    Returns:
        str: Public URL of the uploaded file
    """
    # Generate unique filename with timestamp and UUID
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_filename = f"{int(time.time())}_{str(uuid.uuid4())[:8]}"
    if file_extension:
        unique_filename += f".{file_extension}"
    
    filename = f"{folder}/{unique_filename}"
    
    # Upload to Firebase Storage
    blob = storage.bucket().blob(filename)
    blob.upload_from_file(file.file, content_type=file.content_type)
    blob.make_public()
    
    return blob.public_url


def delete_from_firebase(file_url: str) -> bool:
    """
    Delete a file from Firebase Storage using its public URL.
    
    Args:
        file_url: The public URL of the file to delete
    
    Returns:
        bool: True if deletion was successful, False otherwise
    """
    try:
        # Extract the blob name from the URL
        # Firebase Storage URLs have format: https://storage.googleapis.com/bucket-name/path/to/file
        if "storage.googleapis.com" in file_url:
            # Extract filename from URL
            parts = file_url.split('/')
            file_path = '/'.join(parts[4:]) if len(parts) > 4 else None
            
            if file_path:
                # Remove URL encoding and query parameters
                file_path = file_path.split('?')[0]
                blob = storage.bucket().blob(file_path)
                blob.delete()
                return True
    except Exception as e:
        print(f"Error deleting file from Firebase: {e}")
        return False
    
    return False


