from sqlalchemy import Column, String, DateTime, JSON
from app.database import Base
import uuid
from datetime import datetime

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String)
    stored_filename = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    ocr = Column(JSON)
    analysis = Column(JSON)