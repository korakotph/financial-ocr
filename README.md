# Financial OCR

An AI-powered financial document analysis system that extracts and validates structured data from invoice, receipt, and delivery order images. Built with Thai business documents in mind.

## Features

- **Document Upload** — drag-and-drop or click-to-upload (JPG, PNG, PDF)
- **OCR Extraction** — powered by Typhoon OCR with PaddleOCR fallback
- **AI Analysis** — LLM-based parsing of invoice number, seller, buyer, line items, amounts, and VAT
- **Anomaly Detection** — flags mathematical inconsistencies and missing critical fields
- **Dashboard** — real-time stats (document count, total value, abnormal count) with sortable document table
- **Batch Processing** — parallel upload and evaluation scripts with accuracy reporting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Database | PostgreSQL 15 |
| Object Storage | MinIO (S3-compatible) |
| OCR | Typhoon OCR API + PaddleOCR |
| LLM | Typhoon Cloud API (`typhoon-v2.5-30b-a3b-instruct`) |
| Infrastructure | Docker, Docker Compose |

## Project Structure

```
financial-ocr/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI routes
│       ├── ocr.py           # OCR extraction
│       ├── typhoon_ai.py    # LLM financial analysis
│       ├── summary.py       # Anomaly detection
│       ├── models.py        # Database models
│       └── ...
├── frontend/
│   └── src/app/
│       ├── page.jsx         # Dashboard
│       ├── upload/          # Upload page
│       ├── documents/       # Document detail pages
│       └── ...
├── docker-compose.yml
├── eval_test.py             # Batch evaluation
├── batch_upload.py          # Bulk upload + accuracy report
└── image_for_test/          # Test images
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- A [Typhoon API key](https://opentyphoon.ai) for OCR and LLM analysis

### Running with Docker Compose

```bash
# Clone the repository
git clone <repo-url>
cd financial-ocr

# Set your Typhoon API key (see Configuration below)
# Then start all services
docker-compose up -d
```

Services will be available at:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| MinIO Console | http://localhost:9001 |

### Running Locally (Development)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://finance_user:finance_pass@localhost:5433/finance_db"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:3001
```

## Configuration

Set the following environment variables (or update `docker-compose.yml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://finance_user:finance_pass@postgres:5432/finance_db` |
| `MINIO_ENDPOINT` | MinIO host | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `TYPHOON_API_KEY` | Typhoon Cloud API key | *(required)* |

> **Note:** Before deploying to production, move the Typhoon API key out of source code and into environment variables, and change the default MinIO and PostgreSQL credentials.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Upload and analyze a document |
| `GET` | `/summary` | List all analyzed documents |
| `GET` | `/api/document/{id}` | Get full document details |

## Evaluation & Testing

```bash
# Single upload test
python upload_test.py

# Batch upload with accuracy report
python batch_upload.py

# Multi-round evaluation with concurrency control
python eval_test.py

# Generate and analyze reports
python generate_report.py
python analyze_report.py
```

Test images are in `image_for_test/`. Results are saved as timestamped JSON files in `outputs/`.

## Document Status

Each processed document receives one of three statuses:

- **NORMAL** — data is consistent and complete
- **INCONSISTENT** — mathematical errors or mismatched totals detected
- **ERROR** — processing failed or critical fields are missing
