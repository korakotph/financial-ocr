FINANCE_SCHEMA = {
    "type": "object",
    "required": ["document_type", "total_amount"],
    "properties": {
        "document_type": {"type": "string"},
        "invoice_no": {"type": "string"},
        "date": {"type": "string"},
        "vendor": {"type": "string"},
        "total_amount": {"type": "number"},
        "vat": {"type": "number"},
        "currency": {"type": "string"},
        "anomaly": {"type": "string"}
    }
}