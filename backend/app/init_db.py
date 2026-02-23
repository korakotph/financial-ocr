from app.database import engine, Base
from app.models import Document

def init_db():
    Base.metadata.create_all(bind=engine)