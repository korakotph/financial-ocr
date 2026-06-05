import os
import requests
import json
from pathlib import Path
from app.prompt import FINANCE_PROMPT
from app.postprocess import fill_missing_fields

PROMPT_FILE = Path(__file__).parent.parent / "prompt.txt"

def get_prompt() -> str:
    if PROMPT_FILE.exists():
        return PROMPT_FILE.read_text(encoding="utf-8")
    return FINANCE_PROMPT

TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY", "sk-u5s6zbDHJKpQHrCYJk9oFDOqNHGyqMDh0hmGEgqR9pVJlLcV")
TYPHOON_URL = os.getenv("TYPHOON_URL", "https://api.opentyphoon.ai/v1/chat/completions")
MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2.5-30b-a3b-instruct")
TIMEOUT = int(os.getenv("TYPHOON_TIMEOUT", "180"))
MAX_RETRIES = int(os.getenv("TYPHOON_MAX_RETRIES", "2"))


def _call_api(prompt_text: str) -> dict:
    headers = {
        "Authorization": f"Bearer {TYPHOON_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0,
        "max_tokens": 4096,
    }
    res = requests.post(TYPHOON_URL, headers=headers, json=payload, timeout=TIMEOUT)
    res.raise_for_status()
    return res.json()


def analyze_finance(ocr_result: dict):
    if ocr_result.get("word_count", 0) < 10:
        return {
            "status": "ocr_failed",
            "reason": "TEXT_TOO_SHORT",
            "ocr_preview": ocr_result.get("text", "")[:300]
        }

    ocr_text = ocr_result["text"]
    prompt_text = get_prompt().replace("{OCR_TEXT}", ocr_text)

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            data = _call_api(prompt_text)
            content = data["choices"][0]["message"]["content"].strip()

            # strip markdown code block if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                return {"status": "llm_output_invalid", "raw": content}

            # Post-process: fill any fields the LLM missed via regex
            parsed = fill_missing_fields(parsed, ocr_text)

            return {"status": "success", "data": parsed}

        except requests.exceptions.Timeout as e:
            last_error = e
            print(f"[TYPHOON] Timeout on attempt {attempt}/{MAX_RETRIES}", flush=True)
            if attempt == MAX_RETRIES:
                return {"status": "timeout", "attempts": attempt}

        except requests.exceptions.HTTPError as e:
            return {"status": "error", "reason": str(e), "detail": e.response.text if e.response else ""}

        except Exception as e:
            return {"status": "error", "reason": str(e)}

    return {"status": "timeout", "attempts": MAX_RETRIES}
