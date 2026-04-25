from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil, uuid, os, json as _json
from pathlib import Path

REPORT_DIR_PATH = Path(__file__).parent.parent.parent / "report"

from app.ocr import extract_text
from app.typhoon_ai import analyze_finance, get_prompt, PROMPT_FILE
from app.summary import detect_abnormal
from app.utils import trim_ocr
from app.prompt import FINANCE_PROMPT

import json
from datetime import datetime

from app.database import SessionLocal, engine, Base
from app import models
Document = models.Document

from sqlalchemy.orm import Session

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/analyze")
def analyze_document(file: UploadFile = File(...),db: Session = Depends(get_db)):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_id = str(uuid.uuid4())

    original_name = os.path.basename(file.filename)
    safe_name = original_name.replace(" ", "_")

    file_path = f"{UPLOAD_DIR}/{timestamp}_{file_id}_{safe_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    import time
    t0 = time.time()

    # OCR
    ocr_result = extract_text(file_path)
    t_ocr = time.time()
    print(f"[TIMING] OCR: {t_ocr - t0:.2f}s | chars={ocr_result.get('char_count',0)}", flush=True)

    trimmed_text = trim_ocr(ocr_result["text"])
    print(f"[TIMING] trim: chars {ocr_result.get('char_count',0)} → {len(trimmed_text)}", flush=True)

    # AI Analysis — ใช้ trimmed text เพื่อลด token และเพิ่มความเร็ว
    ocr_for_analysis = {**ocr_result, "text": trimmed_text}
    analysis = analyze_finance(ocr_for_analysis)
    t_ai = time.time()
    print(f"[TIMING] AI:  {t_ai - t_ocr:.2f}s", flush=True)
    print(f"[TIMING] Total: {t_ai - t0:.2f}s", flush=True)
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

class AnalysisUpdate(BaseModel):
    analysis: dict

@app.put("/api/document/{doc_id}")
def update_document(doc_id: str, body: AnalysisUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="document_not_found")
    doc.analysis = body.analysis
    db.commit()
    return {"ok": True}

class PromptBody(BaseModel):
    prompt: str

@app.get("/prompt")
def get_prompt_api():
    return {"prompt": get_prompt()}

@app.put("/prompt")
def update_prompt(body: PromptBody):
    PROMPT_FILE.write_text(body.prompt, encoding="utf-8")
    return {"ok": True}

@app.post("/prompt/reset")
def reset_prompt():
    if PROMPT_FILE.exists():
        PROMPT_FILE.unlink()
    return {"prompt": FINANCE_PROMPT}

@app.get("/reports")
def list_reports():
    if not REPORT_DIR_PATH.exists():
        return []
    files = sorted(
        [{"filename": f.name, "modified": f.stat().st_mtime}
         for f in REPORT_DIR_PATH.glob("*.json")],
        key=lambda x: x["modified"],
        reverse=True,
    )
    return files

@app.get("/reports/{filename}")
def get_report(filename: str):
    safe = Path(filename).name
    if not safe.endswith(".json"):
        raise HTTPException(status_code=400, detail="invalid_filename")
    path = REPORT_DIR_PATH / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="report_not_found")
    with open(path, encoding="utf-8") as f:
        return _json.load(f)