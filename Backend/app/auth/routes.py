from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta,datetime
from app.database import SessionLocal
from app.models.user import User as UserModel  # Renamed to avoid conflict
from app.auth import schemas, crud, security
from app.auth.schemas import UserCreate, UserLogin, Token
from fastapi import Depends
from app.auth.security import get_current_active_user
from app.models.user import User as UserModel
from app.auth.security import get_current_active_user
from fastapi import Request 

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# routes.py
@router.post("/register", response_model=schemas.User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    db_email = crud.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = crud.create_user(
        db, username=user.username, email=user.email, password=user.password
    )
    return new_user

 
 # Add this import

@router.post("/login", response_model=schemas.Token)
async def login(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        username = data.get("username") or data.get("UserName")
        password = data.get("password") or data.get("Password")

        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Both username/email and password are required"
            )

        # Lookup by username or email
        user = crud.get_user_by_username(db, username=username)
        if not user:
            user = crud.get_user_by_email(db, email=username)

        if not user or not security.verify_password(password, user.PasswordHash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": user.UserName}, expires_delta=access_token_expires
        )

        user.Token = access_token
        user.ExpiresAt = datetime.utcnow() + access_token_expires
        db.commit()
        db.refresh(user)

        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/logout")
async def logout_user(current_user: UserModel = Depends(get_current_active_user), db: Session = Depends(get_db)):
    current_user.Token = None
    current_user.ExpiresAt = None
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/profile", response_model=schemas.User)
def get_profile(current_user: UserModel = Depends(get_current_active_user)):
    return current_user


router.get("/me", response_model=schemas.User)  # This now points to the correct User model
def read_users_me(current_user: UserModel = Depends(security.get_current_active_user)):
    return current_user