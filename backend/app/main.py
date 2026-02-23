from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import shutil, uuid, os

from app.ocr import extract_text
from app.typhoon_ai import analyze_finance
from app.summary import detect_abnormal
from app.utils import trim_ocr

import json
from datetime import datetime

from app.database import SessionLocal, engine, Base
from app import models
Document = models.Document

from sqlalchemy.orm import Session

app = FastAPI()

# create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# @app.get("/", response_class=HTMLResponse)
# def ui():
#     with open("static/index.html", encoding="utf-8") as f:
#         return f.read()
    
# @app.get("/summary/page", response_class=HTMLResponse)
# def summary_page():
#     with open("static/summary.html", encoding="utf-8") as f:
#         return f.read()
    
@app.get("/detail/{doc_id}", response_class=HTMLResponse)
def detail_page(doc_id: str):
    for file in os.listdir(OUTPUT_DIR):
        if doc_id in file:
            with open(os.path.join(OUTPUT_DIR, file), encoding="utf-8") as f:
                data = json.load(f)
            return HTMLResponse(
                content=open("static/detail.html", encoding="utf-8").read()
                .replace("__DATA__", json.dumps(data, ensure_ascii=False))
            )
    
@app.get("/api/document/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return {"error": "document_not_found"}

    return {
        "id": doc.id,
        "filename": doc.filename,
        "stored_filename": doc.stored_filename,
        "created_at": doc.created_at.isoformat(),
        "ocr": doc.ocr,
        "analysis": doc.analysis
    }


@app.post("/analyze")
def analyze_document(file: UploadFile = File(...),db: Session = Depends(get_db)):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_id = str(uuid.uuid4())

    original_name = os.path.basename(file.filename)
    safe_name = original_name.replace(" ", "_")

    file_path = f"{UPLOAD_DIR}/{timestamp}_{file_id}_{safe_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    ocr_result = extract_text(file_path)
    trimmed_text = trim_ocr(ocr_result["text"])

    # AI Analysis
    analysis = analyze_finance(ocr_result)
    # analysis = analyze_finance(trimmed_text)
    # รวมผลลัพธ์ทั้งหมด
    result = {
        "id": file_id,
        "filename": safe_name,
        "stored_filename": f"{timestamp}_{file_id}_{safe_name}",
        "created_at": datetime.now().isoformat(),
        "ocr": ocr_result,
        "analysis": analysis
    }

    doc = Document(
        id=file_id,
        filename=safe_name,
        stored_filename=f"{timestamp}_{file_id}_{safe_name}",
        created_at=datetime.now(),
        ocr=ocr_result,
        analysis=analysis
    )

    db.add(doc)
    db.commit()

    output_path = f"{OUTPUT_DIR}/{timestamp}_{file_id}_{safe_name}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result

@app.get("/summary")
def summary(db: Session = Depends(get_db)):
    results = []

    documents = (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .all()
    )

    for doc in documents:
        analysis = doc.analysis or {}
        analysis_status = analysis.get("status")

        # ❌ วิเคราะห์ไม่สำเร็จ
        if analysis_status != "success":
            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "stored_filename": doc.stored_filename,
                "created_at": doc.created_at.isoformat(),
                "document_type": None,
                "seller": None,
                "buyer": None,
                "subtotal": None,
                "vat": None,
                "total": None,
                "status": analysis_status.upper() if analysis_status else "ERROR",
                "reason": analysis.get("reason")
            })
            continue

        # ✅ วิเคราะห์สำเร็จ
        invoice = analysis.get("data", {})
        status, reason = detect_abnormal(invoice)

        amount = invoice.get("amount", {})
        seller = invoice.get("seller", {})
        buyer = invoice.get("buyer", {})

        results.append({
            "id": doc.id,
            "filename": doc.filename,
            "stored_filename": doc.stored_filename,
            "created_at": doc.created_at.isoformat(),
            "document_type": invoice.get("document_type"),
            "seller": seller.get("name"),
            "buyer": buyer.get("name"),
            "subtotal": amount.get("subtotal"),
            "vat": amount.get("vat_amount"),
            "total": amount.get("total"),
            "status": status,
            "reason": reason
        })

    return results