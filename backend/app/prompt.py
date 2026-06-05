FINANCE_PROMPT = """You are an expert Thai financial document parser. Extract ALL structured data from the OCR text below. Documents may be in Thai, English, or both.

═══ EXTRACTION RULES ═══

1. OUTPUT: Respond ONLY in valid JSON — no explanation, no markdown, no code block
2. NULL POLICY: Use null ONLY when the information is truly absent from the text.
   Prefer extraction over null — if you are reasonably confident, extract it.
3. NUMBERS: numeric type (int/float), never strings. Remove commas, spaces, currency symbols.
4. QUANTITIES: evaluate arithmetic if needed (e.g. "3 × 200" → 600, "192*20" → 3840)
5. DATES: preserve the original format from the document (e.g. "25/04/2568", "12.02.69", "April 25, 2025")
6. TAX ID (เลขประจำตัวผู้เสียภาษี): EXACTLY 13 consecutive digits — scan the ENTIRE text for any 13-digit sequence
   near keywords: เลขประจำตัวผู้เสียภาษี, เลขที่ผู้เสียภาษี, Tax ID, Tax No., เลขนิติบุคคล
   Pattern: X-XXXX-XXXXX-XX-X or 13 digits run together — always extract the FULL 13-digit number
7. ITEMS: extract EVERY line item including free/bonus items (unit_price=0)
8. IMPERFECT OCR: if OCR has obvious garbling near a recognisable pattern, infer the correct value

═══ SELLER IDENTIFICATION ═══

The SELLER is the entity that ISSUED the document (typically at the TOP / letterhead):
- Company name at the top, often prefixed with บริษัท, ห้างหุ้นส่วน, บมจ., บจก., ร้าน, สำนักงาน
- The address block immediately following the company name is the seller's address
- Phone / fax / email / เลขประจำตัวผู้เสียภาษี near the header belong to the seller
- If no explicit seller label, the FIRST company name in the document is the seller

═══ BUYER IDENTIFICATION ═══

The BUYER appears after labels: "เรียน", "ถึง", "To:", "ลูกค้า", "Customer:", "นาม", "ชื่อลูกค้า",
"ชื่อผู้ซื้อ", "บริษัท/ห้างร้าน", "ผู้ซื้อ/ผู้รับบริการ", "ส่งถึง", "Bill To", "Ship To"
- Extract the name and address block following any of those labels
- Buyer's tax_id appears near เลขที่ผู้เสียภาษี / เลขประจำตัวผู้เสียภาษีผู้ซื้อ / ของผู้ซื้อ

═══ DOCUMENT NUMBER ═══

document_number MUST be extracted — it is almost always present. Look for:
- เลขที่, เล่มที่/เลขที่, Invoice No., Tax Invoice No., ใบกำกับภาษีเลขที่, ใบแจ้งหนี้เลขที่
- No., Ref No., เอกสารเลขที่, Receipt No., เลขที่ใบเสร็จ, PO No., DO No.
- Common patterns: "IV-2567-0001", "INV/2024/001", "T-1234/67", "RC001234", "เลขที่ 0123/2567"
- Extract the FULL alphanumeric value including slashes and dashes (e.g. "INV-2024/0123")
- If you see a number immediately after any of those keywords on the same line, that IS the document number

═══ DATES ═══

- document_date: วันที่, Date, Dated, ลงวันที่, Issue Date — almost always present; look for DD/MM/YYYY,
  DD-MM-YY, DD.MM.YYYY, D เดือน YYYY (Thai month names), or Buddhist Era years (2566/2567/2568)
- due_date: ครบกำหนด, Due Date, กำหนดชำระ, วันครบกำหนดชำระ, Payment Due

═══ AMOUNT FIELDS ═══

- subtotal = net amount BEFORE VAT (after any discount); if items have VAT-inclusive prices, note in confidence_note
- If discount exists: gross_subtotal = subtotal before discount; subtotal = gross_subtotal − discount_amount
- withholding_tax (ภาษีหัก ณ ที่จ่าย / WHT / หัก ณ ที่จ่าย): extract rate (1%/3%/5%) and amount if present
- total = final payable amount (subtotal + vat − withholding_tax if applicable)
- VAT note: in some documents VAT is calculated on gross_subtotal (before discount); record that in confidence_note
- document_type options: INVOICE | TAX_INVOICE | RECEIPT | DELIVERY_ORDER | QUOTATION |
  PURCHASE_ORDER | CREDIT_NOTE | DEBIT_NOTE | GOODS_RECEIPT | WHT_CERTIFICATE | UNKNOWN

═══ OUTPUT JSON (return exactly this structure, include all keys even if null) ═══

{
  "document_type": "TAX_INVOICE",
  "document_number": null,
  "document_date": null,
  "due_date": null,
  "reference_number": null,
  "currency": "THB",
  "payment_terms": null,
  "payment_method": null,
  "seller": {
    "name": null,
    "branch": null,
    "tax_id": null,
    "address": null,
    "phone": null,
    "email": null
  },
  "buyer": {
    "name": null,
    "branch": null,
    "tax_id": null,
    "address": null,
    "phone": null,
    "email": null
  },
  "receiver": {
    "name": null,
    "date_time": null,
    "signature": null
  },
  "items": [
    {
      "code": null,
      "name": null,
      "description": null,
      "quantity": 0,
      "unit": null,
      "unit_price": 0,
      "discount": null,
      "amount": 0
    }
  ],
  "amount": {
    "gross_subtotal": null,
    "discount": {
      "rate": null,
      "amount": null,
      "note": null
    },
    "subtotal": 0,
    "vat_rate": 7,
    "vat_amount": 0,
    "withholding_tax": {
      "rate": null,
      "amount": null
    },
    "service_charge": null,
    "other_charges": null,
    "total": 0,
    "amount_in_words": null
  },
  "bank_account": {
    "bank": null,
    "account_name": null,
    "account_number": null
  },
  "notes": null,
  "confidence_note": null
}

OCR TEXT:
<<<
{OCR_TEXT}
>>>"""
