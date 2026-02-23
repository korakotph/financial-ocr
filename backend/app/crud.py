from sqlalchemy.orm import Session
from app.models import Document


def create_document(db: Session, filename: str, text: str, result: str, valid: bool):

    doc = Document(
        filename=filename,
        extracted_text=text,
        validation_result=result,
        is_valid=valid
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc