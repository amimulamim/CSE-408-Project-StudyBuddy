from sqlalchemy.orm import Session
from app.users.model import User
from app.users.schema import UserBase, UserUpdate
from time import sleep

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
