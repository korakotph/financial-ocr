#!/usr/bin/env python3
"""
eval_test.py - Upload images N rounds and evaluate system reliability.

Usage:
    python eval_test.py --rounds 3
    python eval_test.py --rounds 5 --sample 100          # random 100 files per round
    python eval_test.py --rounds 5 --limit 20 --delay 1
"""

import argparse
import json
import math
import random
import sys
import time
from datetime import datetime
from pathlib import Path

REPORT_DIR = Path(__file__).parent / "report"

try:
    import requests
except ImportError:
    print("Missing: pip install requests")
    sys.exit(1)


# ─── Args ─────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Batch upload + evaluation")
    parser.add_argument("--url",    default="http://localhost:8010")
    parser.add_argument("--folder", default=str(Path(__file__).parent / "image_for_test"))
    parser.add_argument("--rounds", type=int, default=3,   help="Number of upload rounds")
    parser.add_argument("--delay",  type=float, default=1.0, help="Seconds between uploads")
    parser.add_argument("--limit",  type=int, default=None, help="Use first N files (deterministic)")
    parser.add_argument("--sample", type=int, default=None, help="Randomly sample N files each round")
    parser.add_argument("--seed",   type=int, default=None, help="Random seed for reproducibility")
    parser.add_argument("--output", default=None, help="Override output filename (default: auto in report/)")
    parser.add_argument("--ext",    default="jpg,jpeg,png,pdf")
    return parser.parse_args()


# ─── Upload ───────────────────────────────────────────────────────────────────

def upload_file(base_url: str, file_path: Path) -> dict:
    endpoint = f"{base_url.rstrip('/')}/analyze"
    with open(file_path, "rb") as f:
        resp = requests.post(
            endpoint,
            files={"file": (file_path.name, f, "image/jpeg")},
            timeout=300,
        )
    resp.raise_for_status()
    return resp.json()


def classify(result: dict) -> int:
    return 1 if result.get("analysis", {}).get("status") == "success" else 0


def extract_canonical_text(result: dict) -> str:
    """Extract key text fields from analysis result for BLEU comparison."""
    analysis = result.get("analysis", {})
    if analysis.get("status") != "success":
        return ""
    data = analysis.get("data", {})
    parts = []
    if data.get("document_type"):
        parts.append(str(data["document_type"]))
    if data.get("document_number"):
        parts.append(str(data["document_number"]))
    seller = data.get("seller") or {}
    if seller.get("name"):
        parts.append(str(seller["name"]))
    buyer = data.get("buyer") or {}
    if buyer.get("name"):
        parts.append(str(buyer["name"]))
    for item in data.get("items") or []:
        desc = item.get("description") or item.get("name") or ""
        if desc:
            parts.append(str(desc))
    amount = data.get("amount") or {}
    if amount.get("total") is not None:
        parts.append(str(amount["total"]))
    return " ".join(parts)


# ─── BLEU ─────────────────────────────────────────────────────────────────────

def _ngrams(tokens: list, n: int) -> dict:
    counts = {}
    for i in range(len(tokens) - n + 1):
        ng = tuple(tokens[i:i + n])
        counts[ng] = counts.get(ng, 0) + 1
    return counts


def sentence_bleu(reference: str, hypothesis: str, max_n: int = 2) -> float:
    """Sentence-level BLEU-2 with brevity penalty (no external deps)."""
    ref_tok = reference.lower().split()
    hyp_tok = hypothesis.lower().split()
    if not ref_tok or not hyp_tok:
        return 0.0

    precisions = []
    for n in range(1, max_n + 1):
        ref_ng = _ngrams(ref_tok, n)
        hyp_ng = _ngrams(hyp_tok, n)
        total = sum(hyp_ng.values())
        if total == 0:
            precisions.append(0.0)
            continue
        matches = sum(min(c, ref_ng.get(ng, 0)) for ng, c in hyp_ng.items())
        precisions.append(matches / total)

    if all(p == 0 for p in precisions):
        return 0.0

    log_avg = sum(math.log(p) if p > 0 else -999 for p in precisions) / len(precisions)
    bp = 1.0 if len(hyp_tok) >= len(ref_tok) else math.exp(1 - len(ref_tok) / len(hyp_tok))
    return bp * math.exp(log_avg)


def compute_bleu_scores(baseline: dict, comparison_rounds: list) -> dict:
    """
    For each round R > 1, compute per-file and average BLEU score
    comparing extracted text vs Round 1 baseline.
    Returns {round_num: {avg: float, per_file: {filename: float}}}
    """
    scores = {}
    for r_idx, round_data in enumerate(comparison_rounds, start=2):
        per_file = {}
        file_scores = []
        for fname, b_entry in baseline.items():
            r_entry = round_data.get(fname)
            if r_entry is None:
                continue
            ref  = b_entry.get("text", "")
            hyp  = r_entry.get("text", "")
            if not ref and not hyp:
                continue
            score = sentence_bleu(ref, hyp) if ref else 0.0
            per_file[fname] = round(score, 4)
            file_scores.append(score)
        scores[r_idx] = {
            "avg": round(sum(file_scores) / len(file_scores), 4) if file_scores else 0.0,
            "per_file": per_file,
        }
    return scores


# ─── Metrics ──────────────────────────────────────────────────────────────────

def compute_metrics(y_true: list, y_pred: list) -> dict:
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    n  = len(y_true)

    accuracy  = (tp + tn) / n if n else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return dict(tp=tp, tn=tn, fp=fp, fn=fn,
                accuracy=accuracy, precision=precision, recall=recall, f1=f1)


def avg_metrics(metrics_list: list) -> dict:
    keys = ["accuracy", "precision", "recall", "f1"]
    return {k: sum(m[k] for m in metrics_list) / len(metrics_list) for k in keys}


def fmt_time(seconds: float) -> str:
    if seconds >= 60:
        return f"{seconds/60:.1f} min"
    return f"{seconds:.2f} s"


def _format_confusion_matrix(tp, tn, fp, fn) -> list:
    return [
        "",
        "    Confusion Matrix (Predicted ->)",
        "                      Pred Success  Pred Failure",
        f"    Actual Success        {tp:>6}        {fn:>6}",
        f"    Actual Failure        {fp:>6}        {tn:>6}",
        "",
    ]


def _format_metrics(m: dict, timing: dict = None) -> list:
    lines = [
        f"    Accuracy  : {m['accuracy']:.4f}  ({m['accuracy']*100:.1f}%)",
        f"    Precision : {m['precision']:.4f}",
        f"    Recall    : {m['recall']:.4f}",
        f"    F1-score  : {m['f1']:.4f}",
    ]
    if timing:
        lines.append(
            f"    Time/file : min={fmt_time(timing['min'])}  "
            f"max={fmt_time(timing['max'])}  avg={fmt_time(timing['avg'])}"
        )
    return lines


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    folder = Path(args.folder)
    exts = [e.strip().lower() for e in args.ext.split(",")]

    if not folder.exists():
        print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)

    all_files = sorted(
        f for f in folder.iterdir()
        if f.is_file() and f.suffix.lower().lstrip(".") in exts
    )
    if args.limit:
        all_files = all_files[:args.limit]
    if not all_files:
        print(f"[ERROR] No files found in {folder}")
        sys.exit(1)

    rng = random.Random(args.seed)

    # Sample once — same files used in every round
    if args.sample and args.sample < len(all_files):
        selected_files = sorted(rng.sample(all_files, args.sample))
        mode = f"random sample {len(selected_files)} (fixed across all rounds)"
    else:
        selected_files = all_files
        mode = f"all {len(all_files)}"

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    run_ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"API URL  : {args.url}")
    print(f"Folder   : {folder}")
    print(f"Pool     : {len(all_files)} files")
    print(f"Mode     : {mode} files per round")
    print(f"Rounds   : {args.rounds}")
    print(f"Delay    : {args.delay}s")
    json_path = Path(args.output) if args.output else REPORT_DIR / f"eval_{run_ts}.json"
    log_path  = REPORT_DIR / f"eval_{run_ts}.log"
    print(f"Report   : {json_path}")
    print(f"Log      : {log_path}")
    print("=" * 70)

    # round_results[r][filename] = {label, status, elapsed, text}
    round_results   = []
    round_files     = []
    round_timing    = []

    log_file = open(log_path, "w", encoding="utf-8")

    def log(msg: str):
        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()

    for round_idx in range(args.rounds):
        files = selected_files  # same files every round

        total = len(files)
        log(f"\n--- Round {round_idx + 1}/{args.rounds}  ({total} files) ---")
        this_round = {}
        elapsed_times = []

        for idx, file_path in enumerate(files, start=1):
            tag = f"  [{idx:>3}/{total}]"
            line_prefix = f"{tag} {file_path.name} ... "
            print(line_prefix, end="", flush=True)

            t_start = time.perf_counter()
            try:
                result    = upload_file(args.url, file_path)
                elapsed   = time.perf_counter() - t_start
                label_val = classify(result)
                status    = result.get("analysis", {}).get("status", "unknown")
                doc_id    = result.get("id", "?")
                text      = extract_canonical_text(result)
                suffix = f"{'OK ' if label_val else 'FAIL'}  {fmt_time(elapsed):>8}  status={status}"
                print(suffix)
                log_file.write(line_prefix + suffix + "\n")
                log_file.flush()
                this_round[file_path.name] = {
                    "label": label_val, "status": status,
                    "id": doc_id, "elapsed": elapsed, "text": text,
                }
                elapsed_times.append(elapsed)

            except requests.exceptions.ConnectionError:
                elapsed = time.perf_counter() - t_start
                suffix = f"FAIL  {fmt_time(elapsed):>8}  (cannot connect)"
                print(suffix)
                log_file.write(line_prefix + suffix + "\n")
                log_file.flush()
                this_round[file_path.name] = {
                    "label": 0, "status": "connection_error", "elapsed": elapsed, "text": "",
                }
                log("  Aborting — API unreachable.")
                round_results.append(this_round)
                round_files.append(files)
                round_timing.append(_timing_stats(elapsed_times))
                _save_and_report(round_results, round_files, round_timing, json_path, log_file)
                log_file.close()
                sys.exit(1)

            except Exception as e:
                elapsed = time.perf_counter() - t_start
                suffix = f"FAIL  {fmt_time(elapsed):>8}  {e}"
                print(suffix)
                log_file.write(line_prefix + suffix + "\n")
                log_file.flush()
                this_round[file_path.name] = {
                    "label": 0, "status": str(e), "elapsed": elapsed, "text": "",
                }
                elapsed_times.append(elapsed)

            if idx < total and args.delay > 0:
                time.sleep(args.delay)

        round_results.append(this_round)
        round_files.append(files)
        round_timing.append(_timing_stats(elapsed_times))

        t = round_timing[-1]
        log(f"  Round {round_idx+1} timing: "
            f"min={fmt_time(t['min'])}  max={fmt_time(t['max'])}  avg={fmt_time(t['avg'])}  "
            f"total={fmt_time(t['total'])}")

    _save_and_report(round_results, round_files, round_timing, json_path, log_file)
    log_file.close()


def _timing_stats(elapsed_list: list) -> dict:
    if not elapsed_list:
        return {"min": 0, "max": 0, "avg": 0, "total": 0}
    return {
        "min":   min(elapsed_list),
        "max":   max(elapsed_list),
        "avg":   sum(elapsed_list) / len(elapsed_list),
        "total": sum(elapsed_list),
    }


def _save_and_report(round_results, round_files, round_timing, json_path, log_file):
    n_rounds = len(round_results)

    def log(msg: str):
        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()

    # Baseline = Round 1
    baseline = round_results[0]
    baseline_files = [f.name for f in round_files[0]]

    log("\n" + "=" * 70)
    log("  CONSISTENCY REPORT")
    log(f"  Baseline : Round 1  ({len(baseline_files)} files)")
    log(f"  Compare  : Rounds 2 to {n_rounds} vs Round 1")
    log("=" * 70)

    # Round 1 success/fail distribution
    b_success = sum(v.get("label", 0) for v in baseline.values())
    b_fail    = len(baseline) - b_success
    log(f"\n  Round 1 (Baseline) Distribution:")
    log(f"    Success : {b_success}  ({b_success/len(baseline)*100:.1f}%)")
    log(f"    Failure : {b_fail}  ({b_fail/len(baseline)*100:.1f}%)")
    log(f"    Timing  : min={fmt_time(round_timing[0]['min'])}  "
        f"max={fmt_time(round_timing[0]['max'])}  avg={fmt_time(round_timing[0]['avg'])}")

    if n_rounds == 1:
        log("\n  Only 1 round — nothing to compare. Run with --rounds >= 2.")
        log("=" * 70)
        _write_json(json_path, n_rounds, round_files, round_results,
                    round_timing, [], {}, {}, log)
        return

    # Compare rounds 2..N vs round 1
    per_round_metrics = []
    inconsistent_per_file = {fname: [] for fname in baseline_files}

    for r_idx in range(1, n_rounds):
        common = [f for f in baseline_files if f in round_results[r_idx]]

        y_true = [baseline.get(f, {}).get("label", 0) for f in common]
        y_pred = [round_results[r_idx].get(f, {}).get("label", 0) for f in common]
        m = compute_metrics(y_true, y_pred)
        t = round_timing[r_idx]
        per_round_metrics.append((r_idx + 1, m, t, len(common)))

        log(f"\n  Round {r_idx + 1} vs Round 1  ({len(common)} common files)")
        for line in _format_confusion_matrix(m["tp"], m["tn"], m["fp"], m["fn"]):
            log(line)
        for line in _format_metrics(m, timing=t):
            log(line)

        for fname, yt, yp in zip(common, y_true, y_pred):
            if yt != yp:
                inconsistent_per_file[fname].append({
                    "round": r_idx + 1,
                    "baseline": "success" if yt == 1 else "failure",
                    "this_round": "success" if yp == 1 else "failure",
                })

    # Average consistency
    if per_round_metrics:
        metrics_only = [m for _, m, _, _ in per_round_metrics]
        avg = avg_metrics(metrics_only)
        all_times = [round_results[r][f]["elapsed"]
                     for r in range(n_rounds) for f in round_results[r]]
        overall_timing = _timing_stats(all_times)

        log("\n" + "-" * 70)
        log(f"  AVERAGE CONSISTENCY (rounds 2–{n_rounds} vs round 1)")
        log(f"    Accuracy  : {avg['accuracy']:.4f}  ({avg['accuracy']*100:.1f}%)")
        log(f"    Precision : {avg['precision']:.4f}")
        log(f"    Recall    : {avg['recall']:.4f}")
        log(f"    F1-score  : {avg['f1']:.4f}")
        log(f"    Time/file : min={fmt_time(overall_timing['min'])}  "
            f"max={fmt_time(overall_timing['max'])}  avg={fmt_time(overall_timing['avg'])}")
        log(f"    Total time: {fmt_time(overall_timing['total'])}")
    else:
        avg = {}

    # BLEU scores
    bleu = compute_bleu_scores(baseline, round_results[1:])
    if bleu:
        avg_bleu = sum(v["avg"] for v in bleu.values()) / len(bleu)
        log("\n" + "-" * 70)
        log(f"  BLEU SCORE (text consistency vs Round 1)")
        for rn, data in bleu.items():
            log(f"    Round {rn} avg BLEU : {data['avg']:.4f}  ({data['avg']*100:.1f}%)")
        log(f"    Overall avg BLEU  : {avg_bleu:.4f}  ({avg_bleu*100:.1f}%)")

    # Inconsistent files
    flipped = {f: v for f, v in inconsistent_per_file.items() if v}
    log("\n" + "-" * 70)
    log(f"  INCONSISTENT FILES ({len(flipped)} files changed result vs round 1)")
    if flipped:
        for fname, changes in list(flipped.items())[:20]:
            change_str = ", ".join(
                f"r{c['round']}:{c['this_round']}" for c in changes
            )
            b_label = "success" if baseline.get(fname, {}).get("label", 0) == 1 else "failure"
            log(f"    {fname}: baseline={b_label} → {change_str}")
        if len(flipped) > 20:
            log(f"    ... and {len(flipped)-20} more")
    else:
        log("    All files gave identical results in every round.")

    log("=" * 70)
    _write_json(json_path, n_rounds, round_files, round_results,
                round_timing, per_round_metrics, avg, bleu, log, flipped)


def _write_json(json_path, n_rounds, round_files, round_results,
                round_timing, per_round_metrics, avg, bleu, log, flipped=None):
    output_data = {
        "config": {
            "rounds": n_rounds,
            "files_per_round": len(round_files[0]) if round_files else 0,
            "mode": "consistency — rounds 2..N vs round 1 baseline",
        },
        "per_round": [
            {
                "round": r + 1,
                "role": "baseline" if r == 0 else "comparison",
                "files": len(round_files[r]),
                "timing": round_timing[r],
                "results": round_results[r],
            }
            for r in range(n_rounds)
        ],
        "consistency_vs_baseline": [
            {"round": rn, "common_files": cf, "metrics": m, "timing": t}
            for rn, m, t, cf in per_round_metrics
        ],
        "average_consistency": avg,
        "bleu_scores": bleu,
        "inconsistent_files": flipped or {},
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    log(f"\n  JSON  saved to: {Path(json_path).resolve()}")


if __name__ == "__main__":
    main()
