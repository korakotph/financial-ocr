def detect_abnormal(invoice: dict):
    amount = invoice.get("amount", {})
    items = invoice.get("items", [])

    subtotal_items = sum(i.get("total", 0) for i in items)
    vat = amount.get("vat_amount", 0)
    total = amount.get("total", 0)

    net_from_vat = round(total - vat, 2)

    if abs(subtotal_items - net_from_vat) > 1:
        return "INCONSISTENT", "VAT base does not match item totals"

    return "NORMAL", None