def detect_abnormal(invoice: dict):
    amount = invoice.get("amount", {}) or {}
    items  = invoice.get("items", []) or []

    subtotal_items = sum((i.get("amount") or i.get("total") or 0) for i in items)
    vat      = amount.get("vat_amount") or 0
    total    = amount.get("total")    or 0
    subtotal = amount.get("subtotal") or 0
    gross_subtotal = amount.get("gross_subtotal") or 0
    discount_amount = (amount.get("discount") or {}).get("amount") or 0

    def _near(a, b, tol=1.0):
        return abs(a - b) <= tol

    net_from_vat = round(total - vat, 2)

    # Case 1: standard — item sum ≈ subtotal (VAT-exclusive)
    if _near(subtotal_items, net_from_vat) or _near(subtotal_items, subtotal):
        return "NORMAL", None

    # Case 2: VAT-inclusive items — item sum ≈ total
    if _near(subtotal_items, total):
        return "NORMAL", None

    # Case 3: discount exists — item sum ≈ gross_subtotal, and gross - discount ≈ subtotal
    if gross_subtotal and discount_amount:
        if _near(subtotal_items, gross_subtotal) and _near(gross_subtotal - discount_amount, subtotal):
            return "NORMAL", None
        # VAT calculated on gross (before discount) — still acceptable
        if _near(subtotal_items, gross_subtotal) and _near(gross_subtotal + vat, total):
            return "NORMAL", None

    # Case 4: paid items only (skip bonus/free items with unit_price=0)
    paid_sum = sum(
        (i.get("amount") or i.get("total") or 0)
        for i in items
        if (i.get("unit_price") or 0) > 0
    )
    if _near(paid_sum, net_from_vat) or _near(paid_sum, subtotal):
        return "NORMAL", None

    # Case 5: percentage tolerance (5%) for rounding-heavy documents
    if total > 0 and abs(subtotal_items - net_from_vat) / total <= 0.05:
        return "NORMAL", None

    detail = (
        f"Item sum ({subtotal_items:,.2f}) ≠ subtotal ({subtotal:,.2f}), "
        f"net_from_vat ({net_from_vat:,.2f})"
    )
    if gross_subtotal:
        detail += f", gross ({gross_subtotal:,.2f})"

    return "INCONSISTENT", detail
