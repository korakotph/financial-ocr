from fastapi import FastAPI, UploadFile, File, Depends
from app.database import engine, Base
from app.models import Document
from app.ocr_service import extract_text
from app.ai_validator import validate_invoice
from sqlalchemy.orm import Session

app = FastAPI()

@app.post("/documents")
def create_document(filename: str, db: Session = Depends(get_db)):

    doc = Document(
        filename=filename,
        extracted_text="example",
        validation_result="valid",
        is_valid=True
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    text = await extract_text(file)
    result = validate_invoice(text)
    return result