from sqlalchemy.orm import Session
from app.users.model import User
from app.users.schema import UserBase, UserUpdate, ProfileEditRequest
from time import sleep
from sqlalchemy.exc import OperationalError
from typing import List, Optional

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

def update_user(db: Session, uid: str, updates: UserUpdate):
    user = db.query(User).filter_by(uid=uid).first()
    if user:
        for attr, value in updates.dict(exclude_unset=True).items():
            setattr(user, attr, value)
        db.commit()
        db.refresh(user)
    return user

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


def update_user_profile(db: Session, uid: str, profile_data: ProfileEditRequest) -> Optional[User]:
    """
    Update user profile with support for array operations on interests
    """
    user = get_user_by_uid(db, uid)
    if not user:
        return None
    
    # Handle all fields except interests normally
    update_data = profile_data.model_dump(exclude_unset=True, exclude={"interests"})
    
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    # Handle interests with special operations
    if profile_data.interests is not None:
        current_interests = user.interests or []
        new_interests = parse_interests_operations(profile_data.interests, current_interests)
        user.interests = new_interests
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise e
