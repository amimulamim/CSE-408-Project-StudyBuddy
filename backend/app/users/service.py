from sqlalchemy.orm import Session
from app.users.model import User
from app.users.schema import UserBase, UserUpdate

def get_or_create_user(db: Session, user_data: UserBase):
    user = db.query(User).filter_by(uid=user_data.uid).first()
    if user is None:
        user = User(**user_data.dict())
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def update_user(db: Session, uid: str, updates: UserUpdate):
    user = db.query(User).filter_by(uid=uid).first()
    if user:
        for attr, value in updates.dict(exclude_unset=True).items():
            setattr(user, attr, value)
        db.commit()
        db.refresh(user)
    return user
