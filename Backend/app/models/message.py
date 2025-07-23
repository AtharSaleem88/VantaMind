from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid

class Message(Base):
    __tablename__ = "Messages"

    MessageId = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    ConversationId = Column(UNIQUEIDENTIFIER, ForeignKey("Conversations.ConversationId"), nullable=False)
    Sender = Column(String(50), nullable=False)
    Content = Column(String, nullable=False)
    CreatedAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
