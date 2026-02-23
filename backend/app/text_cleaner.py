import re

def normalize_text(text: str) -> str:
    text = text.replace(" ", " ")
    text = re.sub(r"(\d)\s+(\d)", r"\1\2", text)  # 1 000 → 1000
    text = text.replace("บาท", " บาท ")
    text = text.replace("%", " % ")
    return text
