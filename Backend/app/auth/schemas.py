from pydantic import BaseModel, EmailStr,validator, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    username: str = Field(..., alias="UserName")
    email: EmailStr = Field(..., alias="Email")

class UserCreate(UserBase):
    username: str
    email: str
    password: str

    class Config:
        populate_by_name = True  # Updated for Pydantic V2 (was allow_population_by_field_name)

class UserLogin(BaseModel):
    username: str = Field(..., alias="UserName")
    password: str = Field(..., alias="Password")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

# Add this User model that matches your database
class User(BaseModel):
    userId: UUID = Field(..., alias="UserId")
    userName: str = Field(..., alias="UserName")
    email: EmailStr = Field(..., alias="Email")
    isActive: bool = Field(..., alias="IsActive")
    isRevoked: bool = Field(..., alias="IsRevoked")
    createdAt: datetime = Field(..., alias="CreatedAt")
    expiresAt: Optional[datetime] = Field(None, alias="ExpiresAt")

    class Config:
        from_attributes = True
        populate_by_name = True