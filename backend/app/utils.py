def trim_ocr(text: str, max_chars: int = 1500) -> str:
    lines = text.splitlines()

    table_lines = []
    summary_lines = []
    in_table = False

    summary_keywords = [
        "ราคารวม", "ราคาสุทธิ", "ภาษีมูลค่าเพิ่ม",
        "VAT", "Subtotal", "Grand Total", "จำนวนเงิน",
        "รวม", "สุทธิ", "Total", "TOTAL",
    ]

    for l in lines:
        line = l.strip()
        if not line:
            continue

        if "<table>" in line:
            in_table = True
        if in_table:
            table_lines.append(line)
        if "</table>" in line:
            in_table = False

        if any(k in line for k in summary_keywords):
            summary_lines.append(line)

    if table_lines or summary_lines:
        result = "\n".join(table_lines + summary_lines)
    else:
        # fallback: ใช้ทั้งหมดถ้าไม่มี table tag
        result = text

    return result[:max_chars]