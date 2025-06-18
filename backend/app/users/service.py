from sqlalchemy.orm import Session
from app.users.model import User
from app.users.schema import UserBase, SecureProfileEdit, AdminUserEdit
from time import sleep
from sqlalchemy.exc import OperationalError
from typing import List, Optional
from datetime import datetime, timezone
from typing import Dict, Any
import json

def get_or_create_user(db: Session, user_data: UserBase, retry: int = 3):
    attempt = 0
    while attempt <= retry:
        try:
            user = db.query(User).filter_by(uid=user_data.uid).first()
            if user is None:
                user = User(**user_data.dict())
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        except OperationalError as e:
            db.rollback()
            attempt += 1
            if attempt > retry:
                raise e  # Raise after final retry
            sleep(0.5)  # small wait before retrying

def parse_interests_operations(interests_str: str, current_interests: List[str]) -> List[str]:
    """
    Parse interests string and perform add/remove operations.
    Format: "+quantum physics,-mechanics,new topic" 
    + means add to array, - means remove from array, plain text replaces or adds
    """
    if not interests_str:
        return current_interests
    
    new_interests = list(current_interests)  # Create a copy
    operations = [op.strip() for op in interests_str.split(",") if op.strip()]
    
    for operation in operations:
        if operation.startswith("+"):
            interest = operation[1:].strip()
            if interest and interest not in new_interests:
                new_interests.append(interest)
        elif operation.startswith("-"):
            interest = operation[1:].strip()
            if interest in new_interests:
                new_interests.remove(interest)
        elif operation not in new_interests:
            new_interests.append(operation)
    
    return new_interests


def get_user_by_uid(db: Session, uid: str) -> Optional[User]:
    """Get user by UID"""
    return db.query(User).filter_by(uid=uid).first()


def admin_update_user(db: Session, uid: str, admin_data: AdminUserEdit) -> Optional[User]:
    """
    Admin-only update function that allows editing administrative fields
    """
    user = get_user_by_uid(db, uid)
    if not user:
        return None

    # Handle all fields except interests normally
    update_data = admin_data.model_dump(exclude_unset=True, exclude={"interests"})
    
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    # Handle interests with special operations
    if admin_data.interests is not None:
        current_interests = user.interests or []
        new_interests = parse_interests_operations(admin_data.interests, current_interests)
        user.interests = new_interests
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise e


def is_user_admin(db: Session, uid: str) -> bool:
    """Check if user has admin privileges"""
    user = get_user_by_uid(db, uid)
    return user and user.is_admin


def is_user_moderator(db: Session, uid: str) -> bool:
    """Check if user has moderator privileges"""
    user = get_user_by_uid(db, uid)
    return user and (user.is_moderator or user.is_admin)





def log_profile_change(user_id: str, changes: Dict[str, Any], 
                      action: str = "profile_update", ip_address: str = None, 
                      user_agent: str = None) -> None:
    """
    Log profile changes for audit purposes.
    In production, this would store audit logs in a separate table.
    """
    audit_entry = {
        "user_id": user_id,
        "action": action,
        "changes": changes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": ip_address,
        "user_agent": user_agent
    }
    
    # In production, you would store this in an audit_logs table
    # For now, we'll just log it
    print(f"AUDIT LOG: {json.dumps(audit_entry, indent=2)}")


def update_user_profile_secure(db: Session, uid: str, profile_data: SecureProfileEdit,
                                ip_address: str = None, user_agent: str = None) -> Optional[User]:
    """
    Secure profile update with audit logging.
    Only allows editing safe fields that regular users should be able to edit.
    Excludes administrative fields like is_admin, is_moderator, current_plan, etc.
    Email is immutable and cannot be changed.
    """
    user = get_user_by_uid(db, uid)
    if not user:
        return None

    # Track changes for audit log
    changes = {}
    update_data = profile_data.model_dump(exclude_unset=True, exclude={"interests"})
    
    for field, new_value in update_data.items():
        if hasattr(user, field):
            old_value = getattr(user, field)
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}
            setattr(user, field, new_value)

    # Handle interests with special operations
    if profile_data.interests is not None:
        old_interests = user.interests or []
        new_interests = parse_interests_operations(profile_data.interests, old_interests)
        if old_interests != new_interests:
            changes["interests"] = {"old": old_interests, "new": new_interests}
        user.interests = new_interests
    
    try:
        db.commit()
        db.refresh(user)
        
        # Log changes if any were made
        if changes:
            log_profile_change(uid, changes, "profile_update", ip_address, user_agent)
        
        return user
    except Exception as e:
        db.rollback()
        raise e


async def validate_and_upload_avatar(avatar) -> str:
    """
    Validate avatar file and upload to Firebase Storage.
    
    Args:
        avatar: UploadFile object from FastAPI
        
    Returns:
        str: Public URL of uploaded avatar
        
    Raises:
        HTTPException: If validation fails or upload errors
    """
    from fastapi import HTTPException, status
    from app.utils.file_upload import upload_to_firebase
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if avatar.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (5MB limit)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    avatar.file.seek(0, 2)  # Seek to end
    file_size = avatar.file.tell()
    avatar.file.seek(0)  # Reset to beginning
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 5MB."
        )
    
    try:
        # Upload to Firebase Storage
        return upload_to_firebase(avatar, folder="avatars")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )
