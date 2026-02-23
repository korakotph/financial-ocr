import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import Session

# =====================================
# Load DATABASE_URL from environment
# =====================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://finance_user:finance_pass@postgres:5432/finance_db"
)

# =====================================
# Create Engine
# =====================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # ตรวจสอบ connection ก่อนใช้
    pool_size=10,
    max_overflow=20
)

# =====================================
# Create Session
# =====================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# =====================================
# Base Model
# =====================================

Base = declarative_base()

# =====================================
# Dependency สำหรับ FastAPI
# =====================================

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()