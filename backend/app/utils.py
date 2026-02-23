def trim_ocr(text: str, max_chars: int = 1200) -> str:
    lines = text.splitlines()

    table_lines = []
    summary_lines = []

    in_table = False

    summary_keywords = [
        "ราคารวม",
        "ราคาสุทธิ",
        "ภาษีมูลค่าเพิ่ม",
        "VAT",
        "Subtotal",
        "Grand Total",
        "จำนวนเงิน"
    ]

    for l in lines:
        line = l.strip()

        # ---- table handling ----
        if "<table>" in line:
            in_table = True

        if in_table:
            table_lines.append(line)

        if "</table>" in line:
            in_table = False

        # ---- summary handling ----
        if any(k in line for k in summary_keywords):
            summary_lines.append(line)

    result = "\n".join(table_lines + summary_lines)

    # ---- hard limit กัน timeout ----
    return result[:max_chars]