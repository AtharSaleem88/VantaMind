from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.auth.security import get_password_hash

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.UserName == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.Email == email).first()

def create_user(db: Session, username: str, email: str, password: str):
    hashed_password = get_password_hash(password)
    db_user = User(
        UserName=username,
        Email=email,
        PasswordHash=hashed_password,
        Password=password,  # Don't store plain text password
        Token=None,  # Will be set during login
        IsActive=True,
        IsRevoked=False,  # Changed to False for new users
        CreatedAt=datetime.utcnow(),
        ExpiresAt=None
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_token(db: Session, user: User, token: str, expires_minutes: int = 30):
    """Store token and set expiration"""
    user.Token = token  # Store the actual JWT token
    user.ExpiresAt = datetime.utcnow() + timedelta(minutes=expires_minutes)
    db.commit()
    db.refresh(user)
    return user