#!/usr/bin/env python3
"""
eval_test.py - Upload images N rounds and evaluate system reliability.

Usage:
    python eval_test.py --rounds 3
    python eval_test.py --rounds 5 --sample 100          # random 100 files per round
    python eval_test.py --rounds 5 --limit 20 --delay 1

    # Multi-session: สุ่ม 10 ไฟล์ใหม่ต่อ session, รัน 5 รอบต่อ session, ทำ 3 sessions
    python eval_test.py --sessions 3 --sample 10 --rounds 5
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
    parser.add_argument("--url",      default="http://localhost:8010")
    parser.add_argument("--folder",   default=str(Path(__file__).parent / "image_for_test"))
    parser.add_argument("--sessions", type=int,   default=1,
                        help="Number of big rounds (outer loops); files re-sampled each session")
    parser.add_argument("--rounds",   type=int,   default=3,
                        help="Number of upload rounds per session (inner consistency check)")
    parser.add_argument("--delay",    type=float, default=1.0, help="Seconds between uploads")
    parser.add_argument("--limit",    type=int,   default=None, help="Use first N files (deterministic)")
    parser.add_argument("--sample",   type=int,   default=None,
                        help="Randomly sample N files per session (new sample each session)")
    parser.add_argument("--seed",     type=int,   default=None, help="Random seed for reproducibility")
    parser.add_argument("--output",   default=None, help="Override output filename (default: auto in report/)")
    parser.add_argument("--ext",      default="jpg,jpeg,png,pdf")
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


def _timing_stats(elapsed_list: list) -> dict:
    if not elapsed_list:
        return {"min": 0, "max": 0, "avg": 0, "total": 0}
    return {
        "min":   min(elapsed_list),
        "max":   max(elapsed_list),
        "avg":   sum(elapsed_list) / len(elapsed_list),
        "total": sum(elapsed_list),
    }


# ─── Session Report ───────────────────────────────────────────────────────────

def _compute_session_report(session_num: int, round_results: list,
                             round_files: list, round_timing: list, log) -> dict:
    """Compute consistency metrics for one session. Logs output, returns dict."""
    n_rounds = len(round_results)
    baseline = round_results[0]
    baseline_files = [f.name for f in round_files[0]]

    b_success = sum(v.get("label", 0) for v in baseline.values())
    b_fail    = len(baseline) - b_success

    log(f"\n  Session {session_num} — Round 1 (Baseline) Distribution:")
    log(f"    Success : {b_success}  ({b_success/len(baseline)*100:.1f}%)")
    log(f"    Failure : {b_fail}  ({b_fail/len(baseline)*100:.1f}%)")
    log(f"    Timing  : min={fmt_time(round_timing[0]['min'])}  "
        f"max={fmt_time(round_timing[0]['max'])}  avg={fmt_time(round_timing[0]['avg'])}")

    if n_rounds == 1:
        log("\n  Only 1 round — nothing to compare.")
        return {
            "session": session_num,
            "files": baseline_files,
            "n_rounds": n_rounds,
            "per_round": [],
            "avg_metrics": {},
            "avg_bleu": 0.0,
            "bleu_scores": {},
            "inconsistent_files": {},
            "overall_timing": _timing_stats([]),
            "round_timing": round_timing,
        }

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
    metrics_only  = [m for _, m, _, _ in per_round_metrics]
    avg           = avg_metrics(metrics_only) if metrics_only else {}
    all_times     = [round_results[r][f]["elapsed"]
                     for r in range(n_rounds) for f in round_results[r]]
    overall_timing = _timing_stats(all_times)

    if avg:
        log(f"\n  Session {session_num} — Avg Consistency (rounds 2–{n_rounds} vs round 1):")
        log(f"    Accuracy  : {avg['accuracy']:.4f}  ({avg['accuracy']*100:.1f}%)")
        log(f"    Precision : {avg['precision']:.4f}")
        log(f"    Recall    : {avg['recall']:.4f}")
        log(f"    F1-score  : {avg['f1']:.4f}")
        log(f"    Time/file : min={fmt_time(overall_timing['min'])}  "
            f"max={fmt_time(overall_timing['max'])}  avg={fmt_time(overall_timing['avg'])}")
        log(f"    Total time: {fmt_time(overall_timing['total'])}")

    # BLEU
    bleu     = compute_bleu_scores(baseline, round_results[1:])
    avg_bleu = sum(v["avg"] for v in bleu.values()) / len(bleu) if bleu else 0.0
    if bleu:
        log(f"\n  BLEU scores (text consistency vs Round 1):")
        for rn, data in bleu.items():
            log(f"    Round {rn} avg BLEU : {data['avg']:.4f}  ({data['avg']*100:.1f}%)")
        log(f"    Session avg BLEU  : {avg_bleu:.4f}  ({avg_bleu*100:.1f}%)")

    # Inconsistent files
    flipped = {f: v for f, v in inconsistent_per_file.items() if v}
    log(f"\n  Inconsistent files: {len(flipped)}")
    for fname, changes in list(flipped.items())[:10]:
        change_str = ", ".join(f"r{c['round']}:{c['this_round']}" for c in changes)
        b_label    = "success" if baseline.get(fname, {}).get("label", 0) == 1 else "failure"
        log(f"    {fname}: baseline={b_label} → {change_str}")
    if len(flipped) > 10:
        log(f"    ... and {len(flipped)-10} more")

    return {
        "session":            session_num,
        "files":              baseline_files,
        "n_rounds":           n_rounds,
        "per_round":          [
            {"round": rn, "common_files": cf, "metrics": m, "timing": t}
            for rn, m, t, cf in per_round_metrics
        ],
        "avg_metrics":        avg,
        "avg_bleu":           avg_bleu,
        "bleu_scores":        bleu,
        "inconsistent_files": flipped,
        "overall_timing":     overall_timing,
        "round_timing":       round_timing,
    }


# ─── Cross-Session Summary ────────────────────────────────────────────────────

def _cross_session_summary(all_sessions: list, log) -> dict:
    """Compute and log averages across all sessions."""
    valid = [s for s in all_sessions if s.get("avg_metrics")]
    if not valid:
        return {}

    keys  = ["accuracy", "precision", "recall", "f1"]
    cross = {}
    for k in keys:
        vals    = [s["avg_metrics"][k] for s in valid if k in s["avg_metrics"]]
        cross[k] = sum(vals) / len(vals) if vals else 0.0

    bleu_vals          = [s["avg_bleu"] for s in valid]
    cross["avg_bleu"]  = sum(bleu_vals) / len(bleu_vals) if bleu_vals else 0.0

    incon_vals                        = [len(s.get("inconsistent_files", {})) for s in all_sessions]
    cross["avg_inconsistent_files"]   = sum(incon_vals) / len(incon_vals) if incon_vals else 0.0

    log("\n" + "=" * 70)
    log(f"  CROSS-SESSION SUMMARY  ({len(all_sessions)} sessions)")
    log("=" * 70)
    log(f"    Avg Accuracy  : {cross['accuracy']:.4f}  ({cross['accuracy']*100:.1f}%)")
    log(f"    Avg Precision : {cross['precision']:.4f}")
    log(f"    Avg Recall    : {cross['recall']:.4f}")
    log(f"    Avg F1-score  : {cross['f1']:.4f}")
    log(f"    Avg BLEU      : {cross['avg_bleu']:.4f}  ({cross['avg_bleu']*100:.1f}%)")
    log(f"    Avg Inconsistent Files: {cross['avg_inconsistent_files']:.1f}")

    # Per-session table
    log("\n  Per-session breakdown:")
    log(f"    {'Session':>7}  {'Files':>5}  {'Accuracy':>8}  {'F1':>6}  {'BLEU':>6}  {'Inconsistent':>12}")
    log(f"    {'─'*7}  {'─'*5}  {'─'*8}  {'─'*6}  {'─'*6}  {'─'*12}")
    for s in all_sessions:
        m = s.get("avg_metrics", {})
        log(f"    {s['session']:>7}  {len(s.get('files', [])):>5}  "
            f"{m.get('accuracy', 0):.4f}    {m.get('f1', 0):.4f}  "
            f"{s.get('avg_bleu', 0):.4f}  {len(s.get('inconsistent_files', {})):>12}")
    log("=" * 70)

    return cross


# ─── JSON Writers ─────────────────────────────────────────────────────────────

def _session_json_path(base: Path, session_num: int) -> Path:
    """Return path for a single session file, e.g. eval_20260606_120000_s1.json"""
    return base.parent / f"{base.name}_s{session_num}.json"


def _summary_json_path(base: Path) -> Path:
    """Return path for cross-session summary file."""
    return base.parent / f"{base.name}_summary.json"


def _write_session_json(base: Path, args, session_data: dict, log):
    """Write one session's results to its own file immediately after it completes."""
    path = _session_json_path(base, session_data["session"])
    output = {
        "config": {
            "session":           session_data["session"],
            "rounds_per_session": args.rounds,
            "sample_per_session": args.sample,
            "delay":             args.delay,
            "url":               args.url,
        },
        "session":                 session_data["session"],
        "files":                   session_data["files"],
        "n_rounds":                session_data["n_rounds"],
        "per_round_consistency":   session_data["per_round"],
        "avg_metrics":             session_data["avg_metrics"],
        "avg_bleu":                session_data["avg_bleu"],
        "bleu_scores":             session_data["bleu_scores"],
        "inconsistent_files":      session_data.get("inconsistent_files", {}),
        "overall_timing":          session_data.get("overall_timing", {}),
        "round_timing":            session_data["round_timing"],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    log(f"  JSON saved to: {path.resolve()}")


def _write_summary_json(base: Path, args, all_sessions: list, cross_summary: dict, log):
    """Write cross-session summary after all sessions complete."""
    path = _summary_json_path(base)
    output = {
        "config": {
            "sessions":           args.sessions,
            "rounds_per_session": args.rounds,
            "sample_per_session": args.sample,
            "delay":              args.delay,
            "url":                args.url,
        },
        "session_files": [
            str(_session_json_path(base, s["session"]).name)
            for s in all_sessions
        ],
        "per_session": [
            {
                "session":     s["session"],
                "files":       s["files"],
                "avg_metrics": s["avg_metrics"],
                "avg_bleu":    s["avg_bleu"],
                "inconsistent_count": len(s.get("inconsistent_files", {})),
            }
            for s in all_sessions
        ],
        "cross_session_summary": cross_summary,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    log(f"  Summary saved to: {path.resolve()}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args   = parse_args()
    folder = Path(args.folder)
    exts   = [e.strip().lower() for e in args.ext.split(",")]

    if not folder.exists():
        print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)

    all_files = sorted(
        f for f in folder.iterdir()
        if f.is_file() and f.suffix.lower().lstrip(".") in exts
    )
    if args.limit:
        all_files = all_files[: args.limit]
    if not all_files:
        print(f"[ERROR] No files found in {folder}")
        sys.exit(1)

    rng = random.Random(args.seed)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    run_ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # base path (no extension) — session files append _s{n}.json, summary appends _summary.json
    if args.output:
        base = Path(args.output)
        base = base.parent / base.stem   # strip .json if user added it
    else:
        base = REPORT_DIR / f"eval_{run_ts}"
    base.parent.mkdir(parents=True, exist_ok=True)

    log_path = base.parent / f"{base.name}.log"

    print(f"API URL  : {args.url}")
    print(f"Folder   : {folder}")
    print(f"Pool     : {len(all_files)} files")
    print(f"Sessions : {args.sessions}  (re-sampled each session)")
    print(f"Rounds   : {args.rounds} per session")
    print(f"Sample   : {args.sample if args.sample else 'all'} files per session")
    print(f"Delay    : {args.delay}s")
    print(f"Output   : {base}_s{{n}}.json  (one file per session)")
    if args.sessions > 1:
        print(f"Summary  : {_summary_json_path(base)}")
    print(f"Log      : {log_path}")
    print("=" * 70)

    log_file = open(log_path, "w", encoding="utf-8")

    def log(msg: str):
        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()

    all_sessions_data: list[dict] = []

    for session_idx in range(args.sessions):
        # Re-sample files for each session
        if args.sample and args.sample < len(all_files):
            selected_files = sorted(rng.sample(all_files, args.sample))
            mode = f"random sample {len(selected_files)}"
        else:
            selected_files = all_files
            mode = f"all {len(all_files)}"

        log(f"\n{'='*70}")
        log(f"  SESSION {session_idx+1}/{args.sessions}  |  {mode} files  |  {args.rounds} rounds")
        log(f"{'='*70}")

        round_results: list[dict] = []
        round_files:   list       = []
        round_timing:  list[dict] = []
        aborted = False

        for round_idx in range(args.rounds):
            total = len(selected_files)
            log(f"\n--- Round {round_idx+1}/{args.rounds}  ({total} files) ---")
            this_round:    dict  = {}
            elapsed_times: list  = []

            for idx, file_path in enumerate(selected_files, start=1):
                tag         = f"  [{idx:>3}/{total}]"
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
                    suffix    = f"{'OK ' if label_val else 'FAIL'}  {fmt_time(elapsed):>8}  status={status}"
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
                    suffix  = f"FAIL  {fmt_time(elapsed):>8}  (cannot connect)"
                    print(suffix)
                    log_file.write(line_prefix + suffix + "\n")
                    log_file.flush()
                    this_round[file_path.name] = {
                        "label": 0, "status": "connection_error", "elapsed": elapsed, "text": "",
                    }
                    log("  Aborting — API unreachable.")
                    round_results.append(this_round)
                    round_files.append(selected_files)
                    round_timing.append(_timing_stats(elapsed_times))
                    aborted = True
                    break

                except Exception as e:
                    elapsed = time.perf_counter() - t_start
                    suffix  = f"FAIL  {fmt_time(elapsed):>8}  {e}"
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
            round_files.append(selected_files)
            round_timing.append(_timing_stats(elapsed_times))

            t = round_timing[-1]
            log(f"  Round {round_idx+1} timing: "
                f"min={fmt_time(t['min'])}  max={fmt_time(t['max'])}  avg={fmt_time(t['avg'])}  "
                f"total={fmt_time(t['total'])}")

            if aborted:
                break

        session_data = _compute_session_report(
            session_idx + 1, round_results, round_files, round_timing, log
        )
        all_sessions_data.append(session_data)

        # บันทึกไฟล์ session ทันทีที่จบ
        _write_session_json(base, args, session_data, log)

        if aborted:
            if len(all_sessions_data) > 1:
                cross = _cross_session_summary(all_sessions_data, log)
                _write_summary_json(base, args, all_sessions_data, cross, log)
            log_file.close()
            sys.exit(1)

    cross = _cross_session_summary(all_sessions_data, log)
    if args.sessions > 1:
        _write_summary_json(base, args, all_sessions_data, cross, log)
    log_file.close()


if __name__ == "__main__":
    main()
