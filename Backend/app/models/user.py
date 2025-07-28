import uuid
from sqlalchemy import Column, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = 'Users'

    UserId = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    UserName = Column(String(255), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    Password = Column(String(255), nullable=False)  # Remove in production
    Email = Column(String(255), nullable=False)
    Token = Column(String(255))  # nvarchar(max) in SQL Server
    CreatedAt = Column(DateTime)
    ExpiresAt = Column(DateTime)
    IsActive = Column(Boolean)  
    IsRevoked = Column(Boolean)  

    __table_args__ = (
        UniqueConstraint('UserName', name='uq_username'),
        UniqueConstraint('Email', name='uq_email'),
    )

    # Relationships
    conversations = relationship("Conversation", back_populates="user")
