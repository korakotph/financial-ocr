"""
Generate full accuracy report from batch_results.json
"""
import sys, json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

RESULTS_FILE = Path(__file__).parent / "batch_results.json"
REPORT_FILE  = Path(__file__).parent / "accuracy_report.md"

results = json.loads(RESULTS_FILE.read_text(encoding="utf-8"))

total        = len(results)
ok_results   = [r for r in results if r["ok"]]
fail_http    = [r for r in results if not r["ok"]]
analyses     = [r["result"].get("analysis", {}) for r in ok_results]
success      = [r for r in ok_results if r["result"].get("analysis", {}).get("status") == "success"]
failed_ai    = [r for r in ok_results if r["result"].get("analysis", {}).get("status") != "success"]

def pct(n, d): return f"{n/d*100:.1f}%" if d else "—"

lines = []
def p(*args): lines.append(" ".join(str(a) for a in args))

p("# Batch Analysis Report")
p()
p(f"**ไฟล์ทั้งหมด:** {total} รูป")
p()

# ── 1. ภาพรวม ──────────────────────────────────────────────────
p("## 1. ภาพรวม")
p()
p("| รายการ | จำนวน | % |")
p("|---|---|---|")
p(f"| อัพโหลดทั้งหมด | {total} | 100% |")
p(f"| HTTP สำเร็จ | {len(ok_results)} | {pct(len(ok_results),total)} |")
p(f"| HTTP Error | {len(fail_http)} | {pct(len(fail_http),total)} |")
p(f"| วิเคราะห์สำเร็จ (success) | {len(success)} | {pct(len(success),total)} |")
p(f"| วิเคราะห์ล้มเหลว | {len(failed_ai)} | {pct(len(failed_ai),total)} |")
p()

# ── 2. HTTP Errors ──────────────────────────────────────────────
p("## 2. HTTP Errors")
p()
if fail_http:
    p("| ไฟล์ | Error |")
    p("|---|---|")
    for r in fail_http:
        p(f"| `{r['file']}` | {r.get('error','—')} |")
else:
    p("_ไม่มี HTTP error_")
p()

# ── 3. AI วิเคราะห์ล้มเหลว ─────────────────────────────────────
p("## 3. AI วิเคราะห์ล้มเหลว")
p()
if failed_ai:
    p("| ไฟล์ | status | reason |")
    p("|---|---|---|")
    for r in failed_ai:
        a = r["result"].get("analysis", {})
        p(f"| `{r['file']}` | {a.get('status','—')} | {a.get('reason','—')} |")
else:
    p("_ไม่มี AI error_")
p()

# ── 4. อัตราการดึงข้อมูล ───────────────────────────────────────
n = len(success)
p("## 4. อัตราการดึงข้อมูล")
p()
p(f"_(จาก {n} เอกสารที่วิเคราะห์สำเร็จ)_")
p()
p("| Field | พบ | % |")
p("|---|---|---|")

def count_field(key):
    return sum(1 for r in success if r["result"]["analysis"].get("data",{}).get(key))

def count_nested(p1, p2):
    return sum(1 for r in success if r["result"]["analysis"].get("data",{}).get(p1,{}).get(p2))

def count_amount(key):
    return sum(1 for r in success if r["result"]["analysis"].get("data",{}).get("amount",{}).get(key))

fields = [
    ("document_type",    count_field("document_type")),
    ("document_number",  count_field("document_number")),
    ("document_date",    count_field("document_date")),
    ("seller.name",      count_nested("seller","name")),
    ("seller.tax_id",    count_nested("seller","tax_id")),
    ("buyer.name",       count_nested("buyer","name")),
    ("buyer.tax_id",     count_nested("buyer","tax_id")),
    ("amount.subtotal",  count_amount("subtotal")),
    ("amount.vat_amount",count_amount("vat_amount")),
    ("amount.total",     count_amount("total")),
]
for label, cnt in fields:
    emoji = "✅" if cnt/n >= 0.9 else ("⚠️" if cnt/n >= 0.5 else "❌")
    p(f"| {emoji} {label} | {cnt}/{n} | {pct(cnt,n)} |")
p()

# ── 5. ความสอดคล้องทางคณิตศาสตร์ ───────────────────────────────
p("## 5. ความสอดคล้องทางคณิตศาสตร์ (subtotal + VAT ≈ total)")
p()
math_pass, math_fail_list = [], []
for r in success:
    amt = r["result"]["analysis"].get("data",{}).get("amount",{})
    sub, vat, tot = amt.get("subtotal"), amt.get("vat_amount"), amt.get("total")
    if sub and vat and tot:
        diff_pct = abs((sub + vat) - tot) / max(abs(tot), 1) * 100
        if diff_pct <= 2:
            math_pass.append(r)
        else:
            math_fail_list.append((r, sub, vat, tot, diff_pct))

math_n = len(math_pass) + len(math_fail_list)
p(f"| | จำนวน | % |")
p("|---|---|---|")
p(f"| ตรวจสอบได้ | {math_n} | {pct(math_n,n)} |")
p(f"| ✅ ผ่าน (≤2%) | {len(math_pass)} | {pct(len(math_pass),math_n)} |")
p(f"| ❌ ไม่ผ่าน (>2%) | {len(math_fail_list)} | {pct(len(math_fail_list),math_n)} |")
p()

if math_fail_list:
    p("### รายการที่ math ไม่สอดคล้อง")
    p()
    p("| ไฟล์ | subtotal | VAT | total | calc | diff% |")
    p("|---|---|---|---|---|---|")
    for r, sub, vat, tot, diff_pct in sorted(math_fail_list, key=lambda x: -x[4]):
        calc = sub + vat
        p(f"| `{r['file']}` | {sub:,.2f} | {vat:,.2f} | {tot:,.2f} | {calc:,.2f} | {diff_pct:.1f}% |")
    p()

# ── 6. ประเภทเอกสาร ─────────────────────────────────────────────
p("## 6. ประเภทเอกสาร")
p()
doc_types = {}
for r in success:
    dt = r["result"]["analysis"].get("data",{}).get("document_type") or "UNKNOWN"
    doc_types[dt] = doc_types.get(dt, 0) + 1
p("| ประเภท | จำนวน | % |")
p("|---|---|---|")
for dt, cnt in sorted(doc_types.items(), key=lambda x: -x[1]):
    p(f"| {dt} | {cnt} | {pct(cnt,n)} |")
p()

# ── 7. รายการที่ seller/buyer หาย ──────────────────────────────
p("## 7. เอกสารที่ไม่พบข้อมูลผู้ขาย/ผู้ซื้อ")
p()
missing_party = [
    r for r in success
    if not r["result"]["analysis"].get("data",{}).get("seller",{}).get("name")
    and not r["result"]["analysis"].get("data",{}).get("buyer",{}).get("name")
]
p(f"พบ **{len(missing_party)}** ไฟล์ ({pct(len(missing_party),n)}) ที่ไม่มีทั้ง seller และ buyer")
p()
if missing_party:
    p("<details><summary>ดูรายการ</summary>")
    p()
    p("| ไฟล์ | document_type | total |")
    p("|---|---|---|")
    for r in missing_party:
        d = r["result"]["analysis"].get("data",{})
        tot = d.get("amount",{}).get("total")
        p(f"| `{r['file']}` | {d.get('document_type','—')} | {tot:,.2f} |" if tot else f"| `{r['file']}` | {d.get('document_type','—')} | — |")
    p()
    p("</details>")
p()

# ── 8. สถิติยอดเงิน ─────────────────────────────────────────────
p("## 8. สถิติยอดเงิน")
p()
totals = [r["result"]["analysis"]["data"]["amount"]["total"]
          for r in success
          if r["result"]["analysis"].get("data",{}).get("amount",{}).get("total")]
if totals:
    totals_sorted = sorted(totals)
    grand = sum(totals)
    avg   = grand / len(totals)
    median = totals_sorted[len(totals_sorted)//2]
    p("| | ค่า (฿) |")
    p("|---|---|")
    p(f"| ยอดรวมทั้งหมด | {grand:,.2f} |")
    p(f"| เฉลี่ย/เอกสาร | {avg:,.2f} |")
    p(f"| Median | {median:,.2f} |")
    p(f"| ต่ำสุด | {totals_sorted[0]:,.2f} |")
    p(f"| สูงสุด | {totals_sorted[-1]:,.2f} |")
    p()

# ── write file ──────────────────────────────────────────────────
report = "\n".join(lines)
REPORT_FILE.write_text(report, encoding="utf-8")
print(report)
print(f"\n→ บันทึกรายงาน: {REPORT_FILE}")
