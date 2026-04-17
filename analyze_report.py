"""
Detailed accuracy report from batch_results.json
Covers: field extraction, math consistency, error classification, timing
"""
import sys, json, re
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

RESULTS_FILE = Path(__file__).parent / "batch_results.json"
REPORT_FILE  = Path(__file__).parent / "analyze_report.md"

results = json.loads(RESULTS_FILE.read_text(encoding="utf-8"))

total        = len(results)
ok_results   = [r for r in results if r["ok"]]
fail_http    = [r for r in results if not r["ok"]]
success_docs = [r for r in ok_results if r["result"].get("analysis", {}).get("status") == "success"]
failed_ai    = [r for r in ok_results if r["result"].get("analysis", {}).get("status") != "success"]

n = len(success_docs)  # base for all rates

def pct(a, b): return f"{a/b*100:.1f}%" if b else "—"
def fmt(v): return f"{v:,.2f}" if v is not None else "—"

lines = []
def p(*args): lines.append(" ".join(str(a) for a in args))

# ════════════════════════════════════════════════════════════════
p("# รายงานความแม่นยำ — Financial OCR")
p()
p(f"_วันที่วิเคราะห์: {datetime.now().strftime('%Y-%m-%d %H:%M')}_")
p()

# ── 1. ภาพรวม ──────────────────────────────────────────────────
p("## 1. ภาพรวม")
p()
p("| รายการ | จำนวน | % |")
p("|---|---:|---:|")
p(f"| ไฟล์ทั้งหมด | {total} | 100% |")
p(f"| HTTP สำเร็จ | {len(ok_results)} | {pct(len(ok_results),total)} |")
p(f"| HTTP Error | {len(fail_http)} | {pct(len(fail_http),total)} |")
p(f"| วิเคราะห์สำเร็จ | {n} | {pct(n,total)} |")
p(f"| วิเคราะห์ล้มเหลว | {len(failed_ai)} | {pct(len(failed_ai),total)} |")
p()

# ── 2. เวลาประมวลผล ─────────────────────────────────────────────
p("## 2. เวลาในการประมวลผล")
p()
times = [r["result"].get("elapsed_sec") for r in ok_results if r["result"].get("elapsed_sec")]
if times:
    times_sorted = sorted(times)
    p("| | วินาที |")
    p("|---|---:|")
    p(f"| เฉลี่ย | {sum(times)/len(times):.1f}s |")
    p(f"| ต่ำสุด | {times_sorted[0]:.1f}s |")
    p(f"| Median | {times_sorted[len(times_sorted)//2]:.1f}s |")
    p(f"| สูงสุด | {times_sorted[-1]:.1f}s |")
    p(f"| รวม | {sum(times)/60:.1f} นาที |")
else:
    # timing not in result — estimate from batch_results timestamps
    p("_(ไม่มีข้อมูล elapsed_sec ใน batch_results — ดูจาก Docker logs แทน)_")
p()

# ── 3. อัตราการดึงข้อมูล ───────────────────────────────────────
p("## 3. อัตราการดึงข้อมูลรายฟิลด์")
p()
p(f"_(จาก {n} เอกสารที่วิเคราะห์สำเร็จ)_")
p()

def data_of(r): return r["result"]["analysis"].get("data", {})
def amt_of(r):  return data_of(r).get("amount", {})
def seller_of(r): return data_of(r).get("seller", {})
def buyer_of(r):  return data_of(r).get("buyer", {})

def cnt(fn):
    c = sum(1 for r in success_docs if fn(r))
    emoji = "✅" if c/n >= 0.9 else ("⚠️" if c/n >= 0.5 else "❌")
    return emoji, c

fields_table = [
    ("เลขที่เอกสาร",          lambda r: data_of(r).get("document_number")),
    ("วันที่เอกสาร",           lambda r: data_of(r).get("document_date")),
    ("ประเภทเอกสาร",          lambda r: data_of(r).get("document_type")),
    ("ผู้ขาย (ชื่อ)",          lambda r: seller_of(r).get("name")),
    ("ผู้ขาย (เลขผู้เสียภาษี)", lambda r: seller_of(r).get("tax_id")),
    ("ผู้ซื้อ (ชื่อ)",          lambda r: buyer_of(r).get("name")),
    ("ผู้ซื้อ (เลขผู้เสียภาษี)", lambda r: buyer_of(r).get("tax_id")),
    ("ยอดก่อน VAT (subtotal)", lambda r: amt_of(r).get("subtotal")),
    ("VAT amount",             lambda r: amt_of(r).get("vat_amount")),
    ("ยอดรวมสุทธิ (total)",    lambda r: amt_of(r).get("total")),
    ("มีรายการสินค้า ≥1",      lambda r: len(data_of(r).get("items", [])) > 0),
]

p("| ฟิลด์ | พบ | % | สถานะ |")
p("|---|---:|---:|:---:|")
for label, fn in fields_table:
    emoji, c = cnt(fn)
    p(f"| {label} | {c}/{n} | {pct(c,n)} | {emoji} |")
p()

# ── 4. ความถูกต้องทางคณิตศาสตร์ ────────────────────────────────
p("## 4. ความสอดคล้องทางคณิตศาสตร์")
p()

math_pass, math_fail_list = [], []
inconsistent_detail = []

for r in success_docs:
    amt   = amt_of(r)
    items = data_of(r).get("items", [])
    sub   = amt.get("subtotal")
    vat   = amt.get("vat_amount", 0) or 0
    tot   = amt.get("total")

    # subtotal + VAT ≈ total
    if sub and tot:
        diff = abs((sub + vat) - tot)
        diff_pct = diff / max(abs(tot), 1) * 100
        if diff_pct <= 2:
            math_pass.append(r)
        else:
            math_fail_list.append((r, sub, vat, tot, diff_pct))

    # item sum vs subtotal (INCONSISTENT check)
    if items and (sub or tot):
        item_sum = sum(i.get("total", 0) for i in items)
        net = round(tot - vat, 2) if tot else sub
        if abs(item_sum - net) > 1 and abs(item_sum - (tot or 0)) > 1:
            paid_sum = sum(i.get("total", 0) for i in items if i.get("unit_price", 0) > 0)
            if abs(paid_sum - net) > 1 and abs(paid_sum - (sub or 0)) > 1:
                inconsistent_detail.append((r, item_sum, sub, tot, vat))

math_n = len(math_pass) + len(math_fail_list)
p("### 4.1 subtotal + VAT ≈ total")
p()
p("| | จำนวน | % |")
p("|---|---:|---:|")
p(f"| ตรวจสอบได้ | {math_n} | {pct(math_n,n)} |")
p(f"| ✅ ผ่าน (≤2%) | {len(math_pass)} | {pct(len(math_pass),math_n)} |")
p(f"| ❌ ไม่ผ่าน (>2%) | {len(math_fail_list)} | {pct(len(math_fail_list),math_n)} |")
p()

if math_fail_list:
    p("<details><summary>รายการที่ math ไม่สอดคล้อง</summary>")
    p()
    p("| ไฟล์ | subtotal | VAT | total | คำนวณได้ | diff% |")
    p("|---|---:|---:|---:|---:|---:|")
    for r, sub, vat, tot, dp in sorted(math_fail_list, key=lambda x: -x[4])[:30]:
        calc = sub + vat
        p(f"| `{r['file']}` | {fmt(sub)} | {fmt(vat)} | {fmt(tot)} | {fmt(calc)} | {dp:.1f}% |")
    p()
    p("</details>")
    p()

p("### 4.2 ผลรวมรายการ ≈ ยอดรวม (INCONSISTENT)")
p()
p(f"พบ **{len(inconsistent_detail)}** เอกสาร ({pct(len(inconsistent_detail),n)}) ที่ผลรวมรายการสินค้าไม่ตรงกับยอดรวม")
p()
if inconsistent_detail:
    p("<details><summary>รายการ INCONSISTENT</summary>")
    p()
    p("| ไฟล์ | item_sum | subtotal | total | diff |")
    p("|---|---:|---:|---:|---:|")
    for r, item_sum, sub, tot, vat in inconsistent_detail[:20]:
        net = round(tot - vat, 2) if tot else sub
        diff = abs(item_sum - (net or 0))
        p(f"| `{r['file']}` | {fmt(item_sum)} | {fmt(sub)} | {fmt(tot)} | {fmt(diff)} |")
    p()
    p("</details>")
    p()

# ── 5. จำแนกประเภทข้อผิดพลาด ───────────────────────────────────
p("## 5. จำแนกประเภทข้อผิดพลาด")
p()

# 5.1 วิเคราะห์ล้มเหลว
p("### 5.1 AI วิเคราะห์ล้มเหลว")
p()
if failed_ai:
    fail_reasons = {}
    for r in failed_ai:
        status = r["result"].get("analysis", {}).get("status", "unknown")
        fail_reasons[status] = fail_reasons.get(status, 0) + 1
    p("| สาเหตุ | จำนวน |")
    p("|---|---:|")
    for s, c in sorted(fail_reasons.items(), key=lambda x: -x[1]):
        p(f"| {s} | {c} |")
    p()
else:
    p("_ไม่มี_")
    p()

# 5.2 เลขที่เอกสารหาย
missing_docnum = [r for r in success_docs if not data_of(r).get("document_number")]
p(f"### 5.2 ขาดเลขที่เอกสาร — {len(missing_docnum)} ไฟล์ ({pct(len(missing_docnum),n)})")
p()

# 5.3 วันที่หาย / รูปแบบผิด
missing_date = [r for r in success_docs if not data_of(r).get("document_date")]
bad_date = []
date_patterns = [
    r"\d{1,2}/\d{1,2}/\d{4}", r"\d{4}-\d{2}-\d{2}",
    r"\d{1,2}\s+\w+\s+\d{4}", r"\d{1,2}-\d{1,2}-\d{4}"
]
for r in success_docs:
    d = data_of(r).get("document_date")
    if d and not any(re.search(pat, str(d)) for pat in date_patterns):
        bad_date.append((r, d))

p(f"### 5.3 วันที่เอกสาร")
p()
p("| ปัญหา | จำนวน | % |")
p("|---|---:|---:|")
p(f"| ไม่พบวันที่ | {len(missing_date)} | {pct(len(missing_date),n)} |")
p(f"| รูปแบบไม่ปกติ | {len(bad_date)} | {pct(len(bad_date),n)} |")
p()
if bad_date:
    p("<details><summary>ตัวอย่างวันที่รูปแบบผิด</summary>")
    p()
    p("| ไฟล์ | ค่าที่ได้ |")
    p("|---|---|")
    for r, d in bad_date[:10]:
        p(f"| `{r['file']}` | `{d}` |")
    p("</details>")
    p()

# 5.4 เลขผู้เสียภาษีหาย / รูปแบบผิด
TAX_ID_RE = re.compile(r"^\d{13}$")
def get_tax_ids(r):
    return [seller_of(r).get("tax_id"), buyer_of(r).get("tax_id")]

missing_tax = [r for r in success_docs if not any(get_tax_ids(r))]
bad_tax_list = []
for r in success_docs:
    for tid in get_tax_ids(r):
        if tid:
            clean = re.sub(r"[-\s]", "", str(tid))
            if not TAX_ID_RE.match(clean):
                bad_tax_list.append((r, tid))
                break

p(f"### 5.4 เลขประจำตัวผู้เสียภาษี")
p()
p("| ปัญหา | จำนวน | % |")
p("|---|---:|---:|")
p(f"| ไม่พบเลย (ทั้งผู้ขายและผู้ซื้อ) | {len(missing_tax)} | {pct(len(missing_tax),n)} |")
p(f"| รูปแบบผิด (ไม่ใช่ 13 หลัก) | {len(bad_tax_list)} | {pct(len(bad_tax_list),n)} |")
p()
if bad_tax_list:
    p("<details><summary>ตัวอย่างเลขผิด</summary>")
    p()
    p("| ไฟล์ | ค่าที่ได้ |")
    p("|---|---|")
    for r, tid in bad_tax_list[:10]:
        p(f"| `{r['file']}` | `{tid}` |")
    p("</details>")
    p()

# 5.5 ยอดรวมผิด (math fail)
p(f"### 5.5 ยอดรวมผิด (subtotal+VAT≠total)")
p()
p(f"พบ **{len(math_fail_list)}** เอกสาร ({pct(len(math_fail_list),n)}) ที่ยอดรวมไม่สอดคล้องทางคณิตศาสตร์")
p()

# 5.6 จำนวนรายการสินค้าไม่ตรง (item count vs OCR text)
p("### 5.6 จำนวนรายการสินค้าในตาราง")
p()
no_items = [r for r in success_docs if len(data_of(r).get("items", [])) == 0]
one_item = [r for r in success_docs if len(data_of(r).get("items", [])) == 1]
multi_items = [r for r in success_docs if len(data_of(r).get("items", [])) > 1]

item_counts = {}
for r in success_docs:
    c = len(data_of(r).get("items", []))
    item_counts[c] = item_counts.get(c, 0) + 1

p("| จำนวนรายการ | เอกสาร | % |")
p("|---:|---:|---:|")
for cnt_k, cnt_v in sorted(item_counts.items()):
    p(f"| {cnt_k} รายการ | {cnt_v} | {pct(cnt_v,n)} |")
p()

# 5.7 เอกสารที่อาจถูกแก้ไข (แสดงสัญญาณ: ยอดไม่ตรง + subtotal ≠ item_sum ขนาดใหญ่)
p("### 5.7 เอกสารที่อาจถูกแก้ไข / มีส่วนลดพิเศษ")
p()
suspicious = []
for r in success_docs:
    amt   = amt_of(r)
    items = data_of(r).get("items", [])
    sub   = amt.get("subtotal")
    vat   = amt.get("vat_amount", 0) or 0
    tot   = amt.get("total")
    gross = amt.get("gross_subtotal")
    disc  = amt.get("discount", {})
    disc_amt = disc.get("amount", 0) if isinstance(disc, dict) else 0

    if not (sub and tot): continue

    item_sum = sum(i.get("total", 0) for i in items)
    math_diff_pct = abs((sub + vat) - tot) / max(abs(tot), 1) * 100

    # Signals: large discount (>20%), math fail AND item mismatch
    signals = []
    if disc_amt and sub and disc_amt / (sub + disc_amt) > 0.20:
        signals.append(f"ส่วนลดสูง {disc_amt/max(sub+disc_amt,1)*100:.0f}%")
    if math_diff_pct > 5:
        signals.append(f"math diff {math_diff_pct:.1f}%")
    if items and item_sum > 0 and abs(item_sum - sub) / max(abs(sub), 1) > 0.20:
        signals.append(f"item≠sub ({fmt(item_sum)}≠{fmt(sub)})")

    if len(signals) >= 2:
        suspicious.append((r, signals))

p(f"เกณฑ์: ส่วนลด>20% **และ** ยอดไม่สอดคล้องอีก 1 ข้อ → พบ **{len(suspicious)}** เอกสาร ({pct(len(suspicious),n)})")
p()
if suspicious:
    p("| ไฟล์ | สัญญาณ |")
    p("|---|---|")
    for r, sigs in suspicious[:20]:
        p(f"| `{r['file']}` | {' · '.join(sigs)} |")
    p()

# ── 6. ประเภทเอกสาร ─────────────────────────────────────────────
p("## 6. ประเภทเอกสาร")
p()
doc_types = {}
for r in success_docs:
    dt = data_of(r).get("document_type") or "UNKNOWN"
    doc_types[dt] = doc_types.get(dt, 0) + 1
p("| ประเภท | จำนวน | % |")
p("|---|---:|---:|")
for dt, c in sorted(doc_types.items(), key=lambda x: -x[1]):
    p(f"| {dt} | {c} | {pct(c,n)} |")
p()

# ── 7. สถิติยอดเงิน ─────────────────────────────────────────────
p("## 7. สถิติยอดเงินสุทธิ")
p()
totals = [amt_of(r).get("total") for r in success_docs if amt_of(r).get("total")]
if totals:
    ts = sorted(totals)
    grand = sum(ts)
    p("| | ฿ |")
    p("|---|---:|")
    p(f"| ยอดรวมทั้งหมด | {fmt(grand)} |")
    p(f"| เฉลี่ย/เอกสาร | {fmt(grand/len(ts))} |")
    p(f"| Median | {fmt(ts[len(ts)//2])} |")
    p(f"| ต่ำสุด | {fmt(ts[0])} |")
    p(f"| สูงสุด | {fmt(ts[-1])} |")
    p()

    # VAT rate distribution
    vat_rates = {}
    for r in success_docs:
        vr = amt_of(r).get("vat_rate")
        if vr is not None:
            vat_rates[vr] = vat_rates.get(vr, 0) + 1
    if vat_rates:
        p("**VAT rate ที่พบ:**")
        p()
        p("| VAT rate | จำนวน |")
        p("|---:|---:|")
        for rate, c in sorted(vat_rates.items()):
            p(f"| {rate}% | {c} |")
        p()

# ── 8. สรุปคะแนนรวม ─────────────────────────────────────────────
p("## 8. สรุปคะแนนความแม่นยำ")
p()

scores = {
    "วิเคราะห์สำเร็จ": pct(n, total),
    "พบเลขที่เอกสาร": pct(sum(1 for r in success_docs if data_of(r).get("document_number")), n),
    "พบวันที่เอกสาร": pct(sum(1 for r in success_docs if data_of(r).get("document_date")), n),
    "พบ Tax ID (ผู้ขาย/ผู้ซื้อ)": pct(n - len(missing_tax), n),
    "พบรายการสินค้า": pct(sum(1 for r in success_docs if data_of(r).get("items")), n),
    "Math consistent": pct(len(math_pass), math_n) if math_n else "—",
    "Item sum ตรง (NORMAL)": pct(n - len(inconsistent_detail), n),
}

p("| หัวข้อ | ค่า |")
p("|---|---:|")
for k, v in scores.items():
    try:
        num = float(v.rstrip("%"))
        emoji = "🟢" if num >= 90 else ("🟡" if num >= 70 else "🔴")
    except:
        emoji = "⚪"
    p(f"| {emoji} {k} | **{v}** |")
p()

# ── write ─────────────────────────────────────────────────────────
report = "\n".join(lines)
REPORT_FILE.write_text(report, encoding="utf-8")
print(report)
print(f"\n→ บันทึก: {REPORT_FILE}")
