"""Post-processing: fill missing fields from OCR text using regex patterns."""
import re

_TAX_ID_RE = re.compile(r'(?<!\d)(\d[\d\-]{11,15}\d)(?!\d)')
_DATE_PATTERNS = [
    re.compile(r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b'),
    re.compile(r'\b(\d{1,2}\s+(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})\b', re.IGNORECASE),
]
_DOC_NUM_RE = re.compile(
    r'(?:เลขที่|Invoice\s*No\.?|Tax\s*Invoice\s*No\.?|Receipt\s*No\.?|Ref\.?\s*No\.?|No\.)\s*[:\s]*([A-Z0-9][A-Z0-9\/\-\.]{2,30})',
    re.IGNORECASE
)


def _extract_tax_ids(text: str) -> list[str]:
    """Return list of plausible 13-digit Thai tax IDs found in text."""
    results = []
    for m in _TAX_ID_RE.finditer(text):
        digits = re.sub(r'\D', '', m.group(1))
        if len(digits) == 13:
            results.append(digits)
    return results


def _extract_first_date(text: str) -> str | None:
    for pat in _DATE_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None


def _extract_doc_number(text: str) -> str | None:
    m = _DOC_NUM_RE.search(text)
    return m.group(1).strip() if m else None


def fill_missing_fields(data: dict, ocr_text: str) -> dict:
    """Fill null fields in LLM-extracted data using regex on OCR text."""
    if not ocr_text:
        return data

    tax_ids = _extract_tax_ids(ocr_text)

    # Fill seller tax_id
    seller = data.get("seller") or {}
    if not seller.get("tax_id") and tax_ids:
        seller["tax_id"] = tax_ids[0]
        data["seller"] = seller

    # Fill buyer tax_id (use second distinct ID if available)
    buyer = data.get("buyer") or {}
    if not buyer.get("tax_id"):
        for tid in tax_ids:
            if tid != seller.get("tax_id"):
                buyer["tax_id"] = tid
                data["buyer"] = buyer
                break

    # Fill document_number
    if not data.get("document_number"):
        doc_num = _extract_doc_number(ocr_text)
        if doc_num:
            data["document_number"] = doc_num

    # Fill document_date
    if not data.get("document_date"):
        date_val = _extract_first_date(ocr_text)
        if date_val:
            data["document_date"] = date_val

    return data
