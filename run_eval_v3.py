#!/usr/bin/env python3
"""
run_eval_v3.py — Standalone evaluation script (no Docker/backend required)

Calls Typhoon OCR + Typhoon LLM directly for each image,
computes field accuracy, and saves results to report/.

Usage:
    pip install typhoon-ocr requests --break-system-packages
    python run_eval_v3.py                    # all 204 images, 1 round
    python run_eval_v3.py --sample 30        # random 30 images
    python run_eval_v3.py --rounds 3         # 3 consistency rounds (same files)
    python run_eval_v3.py --limit 50         # first 50 files only
    python run_eval_v3.py --delay 0.5        # 0.5s pause between calls
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── deps ──────────────────────────────────────────────────────────────────────
try:
    import requests
except ImportError:
    print("Missing: pip install requests"); sys.exit(1)

try:
    from typhoon_ocr.ocr_utils import ocr_document
    HAS_TYPHOON_OCR = True
except ImportError:
    HAS_TYPHOON_OCR = False
    print("[WARN] typhoon-ocr not installed — will call Typhoon vision API instead")

sys.stdout.reconfigure(encoding="utf-8")

# ── config ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
IMAGE_DIR  = BASE_DIR / "image_for_test"
REPORT_DIR = BASE_DIR / "report"
REPORT_DIR.mkdir(exist_ok=True)

PROMPT_FILE = BASE_DIR / "backend" / "prompt.txt"
PROMPT_PY   = BASE_DIR / "backend" / "app" / "prompt.py"

API_KEY = os.getenv("TYPHOON_API_KEY", "sk-u5s6zbDHJKpQHrCYJk9oFDOqNHGyqMDh0hmGEgqR9pVJlLcV")
LLM_URL = "https://api.opentyphoon.ai/v1/chat/completions"
MODEL   = "typhoon-v2.5-30b-a3b-instruct"

# ── helpers ───────────────────────────────────────────────────────────────────

def load_prompt() -> str:
    if PROMPT_FILE.exists():
        return PROMPT_FILE.read_text(encoding="utf-8")
    # fallback: extract FINANCE_PROMPT from prompt.py
    if PROMPT_PY.exists():
        src = PROMPT_PY.read_text(encoding="utf-8")
        m = re.search(r'FINANCE_PROMPT\s*=\s*"""(.*?)"""', src, re.DOTALL)
        if m:
            return m.group(1)
    return "Extract financial document data as JSON.\n\nOCR TEXT:\n<<<\n{OCR_TEXT}\n>>>"


def ocr_image(path: Path) -> dict:
    """Extract text from image via typhoon-ocr or fallback vision API."""
    if HAS_TYPHOON_OCR:
        try:
            result = ocr_document(str(path), api_key=API_KEY)
            if isinstance(result, str):
                text = result.strip()
            else:
                texts = [b["text"] if isinstance(b, dict) else str(b) for b in result]
                text = "\n".join(t for t in texts if t.strip())
            return {"text": text, "word_count": len(text.split()), "ok": True}
        except Exception as e:
            return {"text": "", "word_count": 0, "ok": False, "error": str(e)}

    # Fallback: Typhoon vision (multimodal)
    import base64
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    ext = path.suffix.lower().lstrip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    payload = {
        "model": "typhoon-v2-vision-instruct",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            {"type": "text", "text": "Extract ALL text from this document image. Preserve layout. Return ONLY raw text."}
        ]}],
        "temperature": 0,
        "max_tokens": 4096,
    }
    try:
        r = requests.post(LLM_URL, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                          json=payload, timeout=120)
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip()
        return {"text": text, "word_count": len(text.split()), "ok": True}
    except Exception as e:
        return {"text": "", "word_count": 0, "ok": False, "error": str(e)}


def extract_fields(ocr_text: str, prompt_template: str) -> dict:
    """Call Typhoon LLM to extract structured fields."""
    if len(ocr_text.split()) < 10:
        return {"status": "ocr_failed", "data": None}

    prompt = prompt_template.replace("{OCR_TEXT}", ocr_text)
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
        "max_tokens": 4096,
    }
    try:
        r = requests.post(LLM_URL, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                          json=payload, timeout=90)
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        return {"status": "success", "data": json.loads(content)}
    except requests.exceptions.Timeout:
        return {"status": "timeout", "data": None}
    except json.JSONDecodeError as e:
        return {"status": "json_error", "data": None, "raw": content[:500]}
    except Exception as e:
        return {"status": "error", "data": None, "error": str(e)}


def process_one(path: Path, prompt: str, delay: float = 0.0) -> dict:
    t0 = time.perf_counter()
    ocr = ocr_image(path)
    llm = extract_fields(ocr["text"], prompt) if ocr["ok"] else {"status": "ocr_failed", "data": None}
    elapsed = time.perf_counter() - t0
    if delay:
        time.sleep(delay)
    return {"file": path.name, "ocr": ocr, "analysis": llm, "elapsed_sec": round(elapsed, 2)}


# ── field accuracy helpers ────────────────────────────────────────────────────

def data_of(r):  return (r.get("analysis") or {}).get("data") or {}
def amt_of(r):   return data_of(r).get("amount") or {}
def seller_of(r): return data_of(r).get("seller") or {}
def buyer_of(r):  return data_of(r).get("buyer") or {}

FIELDS = [
    ("document_number", lambda r: data_of(r).get("document_number")),
    ("document_date",   lambda r: data_of(r).get("document_date")),
    ("document_type",   lambda r: data_of(r).get("document_type")),
    ("seller.name",     lambda r: seller_of(r).get("name")),
    ("seller.tax_id",   lambda r: seller_of(r).get("tax_id")),
    ("buyer.name",      lambda r: buyer_of(r).get("name")),
    ("buyer.tax_id",    lambda r: buyer_of(r).get("tax_id")),
    ("amount.subtotal", lambda r: amt_of(r).get("subtotal")),
    ("amount.vat",      lambda r: amt_of(r).get("vat_amount")),
    ("amount.total",    lambda r: amt_of(r).get("total")),
    ("items ≥1",        lambda r: len(data_of(r).get("items") or []) > 0),
]

TAX_ID_RE = re.compile(r"^\d{13}$")

DATE_PATTERNS = [
    re.compile(r"\d{1,2}/\d{1,2}/\d{2,4}"),
    re.compile(r"\d{4}-\d{2}-\d{2}"),
    re.compile(r"\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4}"),
    re.compile(r"\d{1,2}\s+\w+\s+\d{4}"),
]

def date_valid(d) -> bool:
    return bool(d) and any(p.search(str(d)) for p in DATE_PATTERNS)

def taxid_valid(t) -> bool:
    if not t: return False
    clean = re.sub(r"[-\s]", "", str(t))
    return bool(TAX_ID_RE.match(clean))

def build_accuracy_report(results: list) -> dict:
    success = [r for r in results if (r.get("analysis") or {}).get("status") == "success"]
    n = len(success)
    if not n:
        return {"n_success": 0}

    report = {"n_total": len(results), "n_success": n, "success_rate": round(n / len(results), 4), "fields": {}}

    for label, fn in FIELDS:
        found = sum(1 for r in success if fn(r))
        report["fields"][label] = {"found": found, "n": n, "rate": round(found / n, 4)}

    # Extra: date format validity
    dates_valid = sum(1 for r in success if date_valid(data_of(r).get("document_date")))
    report["fields"]["document_date_valid_format"] = {"found": dates_valid, "n": n, "rate": round(dates_valid / n, 4)}

    # Extra: tax_id 13-digit validity
    taxids_valid = sum(1 for r in success
                       if taxid_valid(seller_of(r).get("tax_id")) or taxid_valid(buyer_of(r).get("tax_id")))
    report["fields"]["taxid_valid_13d"] = {"found": taxids_valid, "n": n, "rate": round(taxids_valid / n, 4)}

    # Math consistency
    math_ok = math_total = 0
    for r in success:
        sub = amt_of(r).get("subtotal")
        vat = amt_of(r).get("vat_amount") or 0
        tot = amt_of(r).get("total")
        if sub and tot:
            math_total += 1
            if abs((sub + vat) - tot) / max(abs(tot), 1) <= 0.02:
                math_ok += 1
    report["math_consistency"] = {"ok": math_ok, "total": math_total,
                                   "rate": round(math_ok / math_total, 4) if math_total else None}

    # Errors breakdown
    statuses = {}
    for r in results:
        s = (r.get("analysis") or {}).get("status", "unknown")
        statuses[s] = statuses.get(s, 0) + 1
    report["status_breakdown"] = statuses

    # Timing
    times = [r["elapsed_sec"] for r in results if r.get("elapsed_sec")]
    if times:
        times.sort()
        report["timing"] = {
            "avg": round(sum(times) / len(times), 2),
            "min": round(times[0], 2),
            "median": round(times[len(times) // 2], 2),
            "max": round(times[-1], 2),
            "total_min": round(sum(times) / 60, 1),
        }

    return report


def print_summary(rep: dict):
    n = rep["n_success"]
    total = rep["n_total"]
    print(f"\n{'═'*55}")
    print(f"  ผลการทดลอง  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'═'*55}")
    print(f"  ไฟล์ทั้งหมด        : {total}")
    print(f"  วิเคราะห์สำเร็จ    : {n}  ({rep['success_rate']*100:.1f}%)")
    if rep.get("status_breakdown"):
        for s, c in sorted(rep["status_breakdown"].items(), key=lambda x: -x[1]):
            print(f"    {s:<22}: {c}")
    print()
    print(f"  {'ฟิลด์':<28} {'พบ':>6}  {'%':>7}")
    print(f"  {'-'*28} {'-'*6}  {'-'*7}")
    targets = {"document_number", "document_date", "buyer.tax_id"}
    for label, info in rep.get("fields", {}).items():
        pct = info["rate"] * 100
        flag = " ← TARGET" if label in targets else ""
        bar = "🟢" if pct >= 80 else ("🟡" if pct >= 60 else "🔴")
        print(f"  {bar} {label:<26} {info['found']:>4}/{info['n']:<4} {pct:>6.1f}%{flag}")
    mc = rep.get("math_consistency", {})
    if mc.get("total"):
        pct = (mc["rate"] or 0) * 100
        print(f"  {'Math consistent':<28} {mc['ok']:>4}/{mc['total']:<4} {pct:>6.1f}%")
    t = rep.get("timing", {})
    if t:
        print(f"\n  เวลาเฉลี่ย : {t['avg']}s  |  Median: {t['median']}s  |  Max: {t['max']}s")
        print(f"  เวลารวม   : {t['total_min']} นาที")


# ── main ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--rounds", type=int, default=1)
    p.add_argument("--sample", type=int, default=None)
    p.add_argument("--limit",  type=int, default=None)
    p.add_argument("--delay",  type=float, default=0.3)
    p.add_argument("--workers", type=int, default=3, help="Parallel workers (default 3)")
    p.add_argument("--seed",   type=int, default=42)
    p.add_argument("--output", default=None)
    return p.parse_args()


def main():
    args = parse_args()

    images = sorted(IMAGE_DIR.glob("*.jpg")) + sorted(IMAGE_DIR.glob("*.png"))
    if args.limit:
        images = images[:args.limit]
    if args.sample:
        import random
        random.seed(args.seed)
        images = random.sample(images, min(args.sample, len(images)))

    prompt = load_prompt()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    tag = args.output or f"eval_v3_{ts}"

    print(f"Evaluation: {len(images)} images × {args.rounds} round(s)")
    print(f"Prompt source: {'backend/prompt.txt' if PROMPT_FILE.exists() else 'backend/app/prompt.py'}")
    print(f"Output tag: {tag}\n")

    all_rounds = []

    for rnd in range(1, args.rounds + 1):
        if args.rounds > 1:
            print(f"\n── Round {rnd}/{args.rounds} ──")

        results = []
        done = 0
        t_start = time.time()

        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(process_one, img, prompt, args.delay): img for img in images}
            for future in as_completed(futures):
                res = future.result()
                results.append(res)
                done += 1
                status = (res.get("analysis") or {}).get("status", "err")
                eta = (time.time() - t_start) / done * (len(images) - done)
                print(f"  [{done:>3}/{len(images)}] {status:<12} {res['file']:<45} ETA {eta/60:.1f}m", flush=True)

        rep = build_accuracy_report(results)
        all_rounds.append({"round": rnd, "results": results, "report": rep})

        # Save per-round JSON
        out_file = REPORT_DIR / f"{tag}_r{rnd}.json"
        out_file.write_text(json.dumps({"round": rnd, "report": rep, "results": results},
                                        ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n  → บันทึก: {out_file.name}")
        print_summary(rep)

    # Multi-round: compute consistency across rounds
    if args.rounds > 1:
        from collections import defaultdict
        file_results = defaultdict(list)
        for rnd_data in all_rounds:
            for r in rnd_data["results"]:
                file_results[r["file"]].append(r)

        consistent = sum(
            1 for records in file_results.values()
            if len({json.dumps((data_of(r).get("document_number"), data_of(r).get("document_date")),
                               ensure_ascii=False) for r in records}) == 1
        )
        total_files = len(file_results)
        cons_rate = consistent / total_files if total_files else 0

        print(f"\n{'═'*55}")
        print(f"  Consistency (document_number + document_date เหมือนกันทุก round)")
        print(f"  {consistent}/{total_files} = {cons_rate*100:.1f}%")

    # Combined summary JSON
    summary_file = REPORT_DIR / f"{tag}_summary.json"
    summary_data = {
        "tag": tag,
        "timestamp": ts,
        "prompt_source": "backend/prompt.txt" if PROMPT_FILE.exists() else "backend/app/prompt.py",
        "n_images": len(images),
        "n_rounds": args.rounds,
        "rounds": [{"round": d["round"], "report": d["report"]} for d in all_rounds],
    }
    summary_file.write_text(json.dumps(summary_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  → สรุปรวม: {summary_file.name}")


if __name__ == "__main__":
    main()
