from typhoon_ocr.ocr_utils import ocr_document


def extract_text(path: str):
    """
    OCR ด้วย typhoon-ocr (รับ path เท่านั้น)
    """

    result = ocr_document(
        path,
        api_key="sk-u5s6zbDHJKpQHrCYJk9oFDOqNHGyqMDh0hmGEgqR9pVJlLcV"  # แนะนำย้ายไป env #ใส่ไว้ทดสอบก่อน เสร็จแล้วค่อยย้าย
    )

    # 🟢 กรณี OCR คืน text ตรง ๆ
    if isinstance(result, str):
        text = result.strip()
        return {
            "text": text,
            "char_count": len(text),
            "word_count": len(text.split()),
            "ocr_confidence": 1.0
        }

    texts = []
    confidences = []

    # 🟢 กรณี OCR คืนเป็น list
    for b in result:
        if isinstance(b, dict):
            text = b.get("text", "").strip()
            conf = b.get("confidence", 1.0)
        elif isinstance(b, str):
            text = b.strip()
            conf = 1.0
        else:
            continue

        if text:
            texts.append(text)
            confidences.append(conf)

    full_text = "\n".join(texts).strip()
    avg_conf = sum(confidences) / max(len(confidences), 1)

    return {
        "text": full_text,
        "char_count": len(full_text),
        "word_count": len(full_text.split()),
        "ocr_confidence": round(avg_conf, 3)
    }
