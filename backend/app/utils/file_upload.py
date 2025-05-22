from firebase_admin import storage
import time

def upload_to_firebase(file, folder="uploads"):
    filename = f"{folder}/{int(time.time())}_{file.filename}"
    blob = storage.bucket().blob(filename)
    blob.upload_from_file(file.file, content_type=file.content_type)
    blob.make_public()
    return blob.public_url


