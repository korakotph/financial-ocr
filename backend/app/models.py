from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    extracted_text = Column(Text)

    validation_result = Column(Text)

    is_valid = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())