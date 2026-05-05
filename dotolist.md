# Financial OCR — สิ่งที่ทำแล้ว (Done List)

## โครงสร้างระบบ

- [x] ตั้งค่า Docker Compose ครบทุก service (Frontend, Backend, PostgreSQL, MinIO, Ollama)
- [x] ปรับ host ports เพื่อหลีกเลี่ยง conflict กับ project อื่น (#3)
- [x] ตั้งชื่อ container ให้ตรงกับชื่อ folder (`financial_ocr_*`) (#2)

## Backend (FastAPI)

- [x] OCR ด้วย Typhoon OCR API + PaddleOCR fallback (`ocr.py`, `ocr_service.py`)
- [x] AI วิเคราะห์เอกสารการเงินด้วย Typhoon LLM (`typhoon_ai.py`)
- [x] ตรวจจับ anomaly ทางคณิตศาสตร์ (`summary.py`)
- [x] CRUD และ Database models ด้วย SQLAlchemy + PostgreSQL (`crud.py`, `models.py`)
- [x] Prompt API — ดู/แก้ไข extraction prompt ผ่าน API (`prompt.py`)
- [x] API `/reports` สำหรับ BLEU score analysis (#16)
- [x] API ลบเอกสาร (document delete APIs) (#22 / merge branch)
- [x] แก้ไข `trim_ocr` ที่ทิ้ง header info และปรับปรุง extraction prompt
- [x] แก้ไขเอกสารไม่แสดงหลัง upload

## Frontend (Next.js)

- [x] ออกแบบ UI ด้วย light theme สม่ำเสมอทุกหน้า (#6)
- [x] Sidebar และ Navbar ใช้ light theme (#5)
- [x] แก้ไข layout และ CSS ให้ตรงกับ GitLab design (#4)
- [x] แก้ไข dark mode bleed และออกแบบ Dashboard ใหม่ (#8)
- [x] Dashboard — แสดง stats (จำนวนเอกสาร, ยอดรวม, จำนวน abnormal) พร้อม sortable table
- [x] หน้า Upload เอกสาร (drag-and-drop / click-to-upload)
- [x] หน้า Documents — pagination, filtering, sorting (#22)
- [x] หน้า Document Detail — แก้ไข edit mode และปุ่ม Details (#15)
- [x] หน้า Document Detail — image viewer พร้อม zoom (#20)
- [x] หน้า Prompt — ออกแบบใหม่เพื่อ usability (#19) และ layout fix (#7)
- [x] หน้า Reports — BLEU score analysis + file comparison matrix tab (#16, #63)
- [x] BLEU Score tab — เพิ่ม per-file breakdown (#22)
- [x] ปุ่มลบเอกสารใน UI (#22 / merge branch)
- [x] แก้ไข border shorthand conflict (#21)
- [x] แก้ไข params Promise unwrap ใน document detail (#14)
- [x] แก้ไข `NEXT_PUBLIC_API_URL` สำหรับ browser access (#9)
- [x] แก้ไข TypeError เมื่อ API คืน null prompt (#10)
- [x] แก้ไข TypeError เมื่อ `/reports` คืน non-array (#11)

## Evaluation & Testing

- [x] สคริปต์ batch upload พร้อม accuracy report (`batch_upload.py`)
- [x] สคริปต์ multi-round evaluation พร้อม concurrency control (`eval_test.py`)
- [x] แก้ไข hardcoded paths ใน `eval_test.py` (#13)
- [x] แก้ไข default API URL เป็น port 8010 (#12)
- [x] สคริปต์วิเคราะห์ report (`analyze_report.py`)
- [x] รายงานความแม่นยำ batch 204 รูป (`accuracy_report.md`)

## Documentation

- [x] เขียน README พร้อม tech stack, project structure, API endpoints, และ getting started (#1)
