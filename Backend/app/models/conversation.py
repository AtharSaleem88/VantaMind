from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Conversation(Base):
    __tablename__ = 'Conversations'

    ConversationId = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    UserId = Column(UNIQUEIDENTIFIER, ForeignKey('Users.UserId'), nullable=False)
    Title = Column(String(255), nullable=True)
    StartedAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    EndedAt = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
