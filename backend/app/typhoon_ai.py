import requests
import json
from app.prompt import FINANCE_PROMPT

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "scb10x/llama3.1-typhoon2-8b-instruct"

def analyze_finance(ocr_result: dict):
    if ocr_result.get("word_count", 0) < 10:
        return {
            "status": "ocr_failed",
            "reason": "TEXT_TOO_SHORT",
            "ocr_preview": ocr_result.get("text", "")[:300]
        }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": FINANCE_PROMPT + "\n\nOCR TEXT:\n" + ocr_result["text"]
            }
        ],
        "stream": False
    }

    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=300)
        res.raise_for_status()

        data = res.json()
        if "message" not in data:
            return {"status": "llm_error", "raw": data}

        content = data["message"]["content"]

        try:
            return {
                "status": "success",
                "data": json.loads(content)
            }
        except json.JSONDecodeError:
            return {
                "status": "llm_output_invalid",
                "raw": content
            }

    except requests.exceptions.Timeout:
        return {"status": "timeout"}

    except Exception as e:
        return {"status": "error", "reason": str(e)}
