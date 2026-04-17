#!/usr/bin/env python3
"""
Upload test images from image_for_test/ to the financial-ocr API.

Usage:
    python upload_test.py [options]

Options:
    --url       Base URL of the API  (default: http://localhost:8000)
    --folder    Path to image folder (default: ../image_for_test)
    --delay     Seconds between uploads (default: 2)
    --limit     Max number of files to upload (default: all)
    --output    Output JSON file for results (default: upload_results.json)
    --ext       File extensions to include, comma-separated (default: jpg,jpeg,png,pdf)
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing dependency: requests\nInstall with: pip install requests")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Batch upload images to /analyze endpoint")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    parser.add_argument(
        "--folder",
        default=str(Path(__file__).parent.parent / "financial-ocr" / "image_for_test"),
        help="Path to folder containing test images",
    )
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between uploads")
    parser.add_argument("--limit", type=int, default=None, help="Max files to upload")
    parser.add_argument("--output", default="upload_results.json", help="Output results file")
    parser.add_argument(
        "--ext", default="jpg,jpeg,png,pdf", help="Allowed file extensions (comma-separated)"
    )
    return parser.parse_args()


def collect_files(folder: Path, extensions: list[str]) -> list[Path]:
    files = sorted(
        f for f in folder.iterdir() if f.is_file() and f.suffix.lower().lstrip(".") in extensions
    )
    return files


def upload_file(base_url: str, file_path: Path) -> dict:
    endpoint = f"{base_url.rstrip('/')}/analyze"
    with open(file_path, "rb") as f:
        response = requests.post(
            endpoint,
            files={"file": (file_path.name, f, "image/jpeg")},
            timeout=300,  # OCR can take a while
        )
    response.raise_for_status()
    return response.json()


def main():
    args = parse_args()
    folder = Path(args.folder)
    extensions = [e.strip().lower() for e in args.ext.split(",")]

    if not folder.exists():
        print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)

    files = collect_files(folder, extensions)
    if not files:
        print(f"[WARN]  No files with extensions {extensions} found in {folder}")
        sys.exit(0)

    if args.limit:
        files = files[: args.limit]

    total = len(files)
    print(f"API URL  : {args.url}")
    print(f"Folder   : {folder}")
    print(f"Files    : {total}")
    print(f"Delay    : {args.delay}s between uploads")
    print(f"Output   : {args.output}")
    print("-" * 60)

    results = []
    success = 0
    failed = 0

    for idx, file_path in enumerate(files, start=1):
        label = f"[{idx:>3}/{total}]"
        print(f"{label} {file_path.name} ... ", end="", flush=True)

        try:
            result = upload_file(args.url, file_path)
            status = result.get("analysis", {}).get("status", "unknown")
            doc_id = result.get("id", "?")
            print(f"OK  id={doc_id} status={status}")
            results.append({"file": file_path.name, "success": True, "result": result})
            success += 1
        except requests.exceptions.ConnectionError:
            print("FAIL  (cannot connect to API — is the server running?)")
            results.append({"file": file_path.name, "success": False, "error": "connection_error"})
            failed += 1
            print(f"Aborting — API unreachable at {args.url}")
            break
        except requests.exceptions.HTTPError as e:
            print(f"FAIL  HTTP {e.response.status_code}")
            results.append(
                {"file": file_path.name, "success": False, "error": str(e)}
            )
            failed += 1
        except Exception as e:
            print(f"FAIL  {e}")
            results.append({"file": file_path.name, "success": False, "error": str(e)})
            failed += 1

        if idx < total and args.delay > 0:
            time.sleep(args.delay)

    print("-" * 60)
    print(f"Done: {success} succeeded, {failed} failed out of {total} files")

    output_path = Path(args.output)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Results saved to: {output_path.resolve()}")


if __name__ == "__main__":
    main()
