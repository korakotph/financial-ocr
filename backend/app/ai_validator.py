def validate_invoice(text):
    result = {
        "has_invoice_no": "Invoice" in text,
        "has_total_amount": "Total" in text,
        "valid": False
    }

    if result["has_invoice_no"] and result["has_total_amount"]:
        result["valid"] = True

    return result