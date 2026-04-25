import os
import requests
import json
from pathlib import Path
from app.prompt import FINANCE_PROMPT

PROMPT_FILE = Path(__file__).parent.parent / "prompt.txt"

def get_prompt() -> str:
    if PROMPT_FILE.exists():
        return PROMPT_FILE.read_text(encoding="utf-8")
    return FINANCE_PROMPT

# Typhoon Cloud API (OpenAI-compatible) — เร็วกว่า local Ollama มาก
TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY", "sk-u5s6zbDHJKpQHrCYJk9oFDOqNHGyqMDh0hmGEgqR9pVJlLcV")
TYPHOON_URL = os.getenv("TYPHOON_URL", "https://api.opentyphoon.ai/v1/chat/completions")
MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2.5-30b-a3b-instruct")

def analyze_finance(ocr_result: dict):
    if ocr_result.get("word_count", 0) < 10:
        return {
            "status": "ocr_failed",
            "reason": "TEXT_TOO_SHORT",
            "ocr_preview": ocr_result.get("text", "")[:300]
        }

    headers = {
        "Authorization": f"Bearer {TYPHOON_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": get_prompt().replace("{OCR_TEXT}", ocr_result["text"])
            }
        ],
        "temperature": 0,
        "max_tokens": 4096,
    }

    try:
        res = requests.post(TYPHOON_URL, headers=headers, json=payload, timeout=60)
        res.raise_for_status()

        data = res.json()
        content = data["choices"][0]["message"]["content"].strip()

        # strip markdown code block if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

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

    except requests.exceptions.HTTPError as e:
        return {"status": "error", "reason": str(e), "detail": res.text}

    except Exception as e:
        return {"status": "error", "reason": str(e)}
