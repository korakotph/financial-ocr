def detect_abnormal(invoice: dict):
    amount = invoice.get("amount", {})
    items = invoice.get("items", [])

    subtotal_items = sum(i.get("total", 0) for i in items)
    vat = amount.get("vat_amount", 0)
    total = amount.get("total", 0)
    subtotal = amount.get("subtotal", 0)

    net_from_vat = round(total - vat, 2)

    # กรณีปกติ: item sum ≈ subtotal (VAT-exclusive)
    if abs(subtotal_items - net_from_vat) <= 1:
        return "NORMAL", None

    # กรณี VAT-inclusive: item sum ≈ total (ราคารวม VAT แล้ว)
    if abs(subtotal_items - total) <= 1:
        return "NORMAL", None

    # กรณีมีสินค้าแถม (qty > 0 แต่ราคา 0): ข้ามรายการที่ราคา 0
    paid_items_sum = sum(i.get("total", 0) for i in items if i.get("unit_price", 0) > 0)
    if abs(paid_items_sum - net_from_vat) <= 1 or abs(paid_items_sum - subtotal) <= 1:
        return "NORMAL", None

    return "INCONSISTENT", f"Item sum ({subtotal_items:,.2f}) ≠ subtotal ({net_from_vat:,.2f})"