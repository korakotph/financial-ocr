"""
Batch upload all images in image_for_test/ to /analyze
then print accuracy report.
"""
import sys, os, json, time, math, requests
sys.stdout.reconfigure(encoding="utf-8")
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API = "http://localhost:8000"
FOLDER = Path(__file__).parent / "image_for_test"
CONCURRENCY = 3          # parallel uploads (ไม่โหลด API มากเกินไป)
RESULTS_FILE = Path(__file__).parent / "batch_results.json"

# ─── 1. Upload ────────────────────────────────────────────────
def upload(filepath: Path):
    try:
        with open(filepath, "rb") as f:
            r = requests.post(f"{API}/analyze", files={"file": (filepath.name, f, "image/jpeg")}, timeout=120)
        r.raise_for_status()
        return {"file": filepath.name, "ok": True, "result": r.json()}
    except Exception as e:
        return {"file": filepath.name, "ok": False, "error": str(e)}

images = sorted(FOLDER.glob("*.jpg")) + sorted(FOLDER.glob("*.png"))
total = len(images)
print(f"พบ {total} รูป — เริ่มอัพโหลด (concurrency={CONCURRENCY})\n")

results = []
done = 0
errors = 0
t_start = time.time()

with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
    futures = {ex.submit(upload, img): img for img in images}
    for future in as_completed(futures):
        res = future.result()
        results.append(res)
        done += 1
        if not res["ok"]:
            errors += 1
        elapsed = time.time() - t_start
        avg = elapsed / done
        eta = avg * (total - done)
        print(f"[{done:>3}/{total}] {'✓' if res['ok'] else '✗'} {res['file']:<45} "
              f"ETA {eta/60:.1f}m", flush=True)

RESULTS_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\nบันทึกผลลัพธ์ → {RESULTS_FILE}")

# ─── 2. Accuracy Report ───────────────────────────────────────
print("\n" + "═"*60)
print("  ACCURACY REPORT")
print("═"*60)

ok_results   = [r for r in results if r["ok"]]
fail_results = [r for r in results if not r["ok"]]

analyses = [r["result"].get("analysis", {}) for r in ok_results]
success  = [a for a in analyses if a.get("status") == "success"]
failed   = [a for a in analyses if a.get("status") != "success"]

print(f"\n📊 ภาพรวม")
print(f"  อัพโหลดทั้งหมด  : {total}")
print(f"  HTTP OK         : {len(ok_results)}  ({len(ok_results)/total*100:.1f}%)")
print(f"  HTTP Error      : {len(fail_results)}")
print(f"  วิเคราะห์สำเร็จ : {len(success)}  ({len(success)/total*100:.1f}%)")
print(f"  วิเคราะห์ล้มเหลว: {len(failed)}")

# Status breakdown
status_counts = {}
for a in analyses:
    s = a.get("status", "unknown")
    status_counts[s] = status_counts.get(s, 0) + 1
print(f"\n📋 สถานะการวิเคราะห์")
for s, c in sorted(status_counts.items(), key=lambda x: -x[1]):
    print(f"  {s:<25}: {c:>4} ({c/total*100:.1f}%)")

# Field extraction rate
fields = ["document_type", "document_number", "document_date"]
party_fields = [("seller", "name"), ("seller", "tax_id"), ("buyer", "name"), ("buyer", "tax_id")]
amount_fields = ["subtotal", "vat_amount", "total"]

if success:
    n = len(success)
    print(f"\n🔍 อัตราการดึงข้อมูล (จาก {n} ที่สำเร็จ)")

    for f in fields:
        found = sum(1 for a in success if a.get("data", {}).get(f))
        print(f"  {f:<25}: {found:>4}/{n}  ({found/n*100:.1f}%)")

    for parent, child in party_fields:
        found = sum(1 for a in success if a.get("data", {}).get(parent, {}).get(child))
        label = f"{parent}.{child}"
        print(f"  {label:<25}: {found:>4}/{n}  ({found/n*100:.1f}%)")

    for f in amount_fields:
        found = sum(1 for a in success if a.get("data", {}).get("amount", {}).get(f))
        print(f"  amount.{f:<18}: {found:>4}/{n}  ({found/n*100:.1f}%)")

    # Math consistency (subtotal + vat ≈ total)
    math_ok = 0
    math_fail = 0
    for a in success:
        amt = a.get("data", {}).get("amount", {})
        sub  = amt.get("subtotal")
        vat  = amt.get("vat_amount")
        tot  = amt.get("total")
        if sub and vat and tot:
            calc = sub + vat
            if abs(calc - tot) / max(abs(tot), 1) < 0.02:   # ±2%
                math_ok += 1
            else:
                math_fail += 1

    math_n = math_ok + math_fail
    print(f"\n🧮 ความสอดคล้องทางคณิตศาสตร์ (subtotal + VAT ≈ total)")
    print(f"  ตรวจสอบได้    : {math_n}")
    if math_n:
        print(f"  ผ่าน          : {math_ok}  ({math_ok/math_n*100:.1f}%)")
        print(f"  ไม่ผ่าน (>2%) : {math_fail}  ({math_fail/math_n*100:.1f}%)")

    # VAT rate distribution
    vat_rates = {}
    for a in success:
        r = a.get("data", {}).get("amount", {}).get("vat_rate")
        if r is not None:
            vat_rates[r] = vat_rates.get(r, 0) + 1
    if vat_rates:
        print(f"\n💰 VAT rate ที่พบ")
        for rate, cnt in sorted(vat_rates.items()):
            print(f"  {rate}%  : {cnt}")

    # Document type distribution
    doc_types = {}
    for a in success:
        dt = a.get("data", {}).get("document_type") or "UNKNOWN"
        doc_types[dt] = doc_types.get(dt, 0) + 1
    print(f"\n📄 ประเภทเอกสาร")
    for dt, cnt in sorted(doc_types.items(), key=lambda x: -x[1]):
        print(f"  {dt:<20}: {cnt:>4} ({cnt/n*100:.1f}%)")

# Timing
elapsed = time.time() - t_start
print(f"\n⏱  เวลารวม : {elapsed/60:.1f} นาที  (เฉลี่ย {elapsed/total:.1f}s / รูป)")
print("═"*60)
