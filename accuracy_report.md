# Batch Analysis Report

**ไฟล์ทั้งหมด:** 204 รูป

## 1. ภาพรวม

| รายการ | จำนวน | % |
|---|---|---|
| อัพโหลดทั้งหมด | 204 | 100% |
| HTTP สำเร็จ | 203 | 99.5% |
| HTTP Error | 1 | 0.5% |
| วิเคราะห์สำเร็จ (success) | 203 | 99.5% |
| วิเคราะห์ล้มเหลว | 0 | 0.0% |

## 2. HTTP Errors

| ไฟล์ | Error |
|---|---|
| `เอกสาร invoice_page-0100.jpg` | HTTPConnectionPool(host='localhost', port=8000): Read timed out. (read timeout=120) |

## 3. AI วิเคราะห์ล้มเหลว

_ไม่มี AI error_

## 4. อัตราการดึงข้อมูล

_(จาก 203 เอกสารที่วิเคราะห์สำเร็จ)_

| Field | พบ | % |
|---|---|---|
| ✅ document_type | 203/203 | 100.0% |
| ❌ document_number | 81/203 | 39.9% |
| ❌ document_date | 77/203 | 37.9% |
| ❌ seller.name | 18/203 | 8.9% |
| ❌ seller.tax_id | 7/203 | 3.4% |
| ❌ buyer.name | 22/203 | 10.8% |
| ❌ buyer.tax_id | 60/203 | 29.6% |
| ✅ amount.subtotal | 202/203 | 99.5% |
| ✅ amount.vat_amount | 202/203 | 99.5% |
| ✅ amount.total | 203/203 | 100.0% |

## 5. ความสอดคล้องทางคณิตศาสตร์ (subtotal + VAT ≈ total)

| | จำนวน | % |
|---|---|---|
| ตรวจสอบได้ | 201 | 99.0% |
| ✅ ผ่าน (≤2%) | 195 | 97.0% |
| ❌ ไม่ผ่าน (>2%) | 6 | 3.0% |

### รายการที่ math ไม่สอดคล้อง

| ไฟล์ | subtotal | VAT | total | calc | diff% |
|---|---|---|---|---|---|
| `เอกสาร invoice_page-0168.jpg` | 4,092.00 | 286.44 | 4,708.00 | 4,378.44 | 7.0% |
| `เอกสาร invoice_page-0146.jpg` | 5,036.00 | 329.46 | 5,036.00 | 5,365.46 | 6.5% |
| `เอกสาร invoice_page-0159.jpg` | 28,000.00 | 1,831.78 | 28,000.00 | 29,831.78 | 6.5% |
| `เอกสาร invoice_page-0068.jpg` | 9,630.00 | 630.00 | 9,630.00 | 10,260.00 | 6.5% |
| `เอกสาร invoice_page-0136.jpg` | 3,478.80 | 234.15 | 3,579.15 | 3,712.95 | 3.7% |
| `เอกสาร invoice_page-0091.jpg` | 30,000.00 | 2,100.00 | 31,200.00 | 32,100.00 | 2.9% |

## 6. ประเภทเอกสาร

| ประเภท | จำนวน | % |
|---|---|---|
| INVOICE | 158 | 77.8% |
| UNKNOWN | 38 | 18.7% |
| DELIVERY_ORDER | 7 | 3.4% |

## 7. เอกสารที่ไม่พบข้อมูลผู้ขาย/ผู้ซื้อ

พบ **172** ไฟล์ (84.7%) ที่ไม่มีทั้ง seller และ buyer

<details><summary>ดูรายการ</summary>

| ไฟล์ | document_type | total |
|---|---|---|
| `เอกสาร invoice_page-0001.jpg` | INVOICE | 51,039.00 |
| `เอกสาร invoice_page-0003.jpg` | INVOICE | 26,496.32 |
| `เอกสาร invoice_page-0002.jpg` | INVOICE | 163,068.00 |
| `เอกสาร invoice_page-0004.jpg` | INVOICE | 830.32 |
| `เอกสาร invoice_page-0006.jpg` | INVOICE | 3,317.00 |
| `เอกสาร invoice_page-0005.jpg` | INVOICE | 11,299.20 |
| `เอกสาร invoice_page-0007.jpg` | INVOICE | 6,848.00 |
| `เอกสาร invoice_page-0008.jpg` | INVOICE | 5,992.00 |
| `เอกสาร invoice_page-0009.jpg` | INVOICE | 14,712.50 |
| `เอกสาร invoice_page-0010.jpg` | INVOICE | 11,770.00 |
| `เอกสาร invoice_page-0011.jpg` | INVOICE | 28,890.00 |
| `เอกสาร invoice_page-0012.jpg` | UNKNOWN | 4,173.00 |
| `เอกสาร invoice_page-0013.jpg` | INVOICE | 38,520.00 |
| `เอกสาร invoice_page-0014.jpg` | INVOICE | 37,557.00 |
| `เอกสาร invoice_page-0016.jpg` | INVOICE | 6,420.00 |
| `เอกสาร invoice_page-0015.jpg` | INVOICE | 120,696.00 |
| `เอกสาร invoice_page-0017.jpg` | INVOICE | 13,803.00 |
| `เอกสาร invoice_page-0019.jpg` | INVOICE | 17,655.00 |
| `เอกสาร invoice_page-0018.jpg` | UNKNOWN | 183,505.00 |
| `เอกสาร invoice_page-0020.jpg` | INVOICE | 22,042.00 |
| `เอกสาร invoice_page-0021.jpg` | INVOICE | 9,416.00 |
| `เอกสาร invoice_page-0023.jpg` | DELIVERY_ORDER | 17,655.00 |
| `เอกสาร invoice_page-0024.jpg` | INVOICE | 7,000.00 |
| `เอกสาร invoice_page-0026.jpg` | INVOICE | 10,700.00 |
| `เอกสาร invoice_page-0025.jpg` | UNKNOWN | 33,869.78 |
| `เอกสาร invoice_page-0029.jpg` | INVOICE | 5,885.00 |
| `เอกสาร invoice_page-0027.jpg` | INVOICE | 9,737.00 |
| `เอกสาร invoice_page-0028.jpg` | INVOICE | 10,272.00 |
| `เอกสาร invoice_page-0034.jpg` | INVOICE | 8,868.16 |
| `เอกสาร invoice_page-0035.jpg` | INVOICE | 10,486.00 |
| `เอกสาร invoice_page-0038.jpg` | UNKNOWN | 856.00 |
| `เอกสาร invoice_page-0037.jpg` | INVOICE | 3,210.00 |
| `เอกสาร invoice_page-0036.jpg` | INVOICE | 21,614.00 |
| `เอกสาร invoice_page-0039.jpg` | INVOICE | 20,865.00 |
| `เอกสาร invoice_page-0041.jpg` | INVOICE | 98,975.00 |
| `เอกสาร invoice_page-0040.jpg` | UNKNOWN | 62,336.18 |
| `เอกสาร invoice_page-0042.jpg` | INVOICE | 97,840.80 |
| `เอกสาร invoice_page-0043.jpg` | INVOICE | 104,699.50 |
| `เอกสาร invoice_page-0044.jpg` | INVOICE | 41,263.48 |
| `เอกสาร invoice_page-0045.jpg` | INVOICE | 12,782.22 |
| `เอกสาร invoice_page-0047.jpg` | INVOICE | 67,142.50 |
| `เอกสาร invoice_page-0046.jpg` | INVOICE | 61,311.00 |
| `เอกสาร invoice_page-0048.jpg` | INVOICE | 6,634.00 |
| `เอกสาร invoice_page-0049.jpg` | INVOICE | 67,260.20 |
| `เอกสาร invoice_page-0050.jpg` | INVOICE | 54,197.64 |
| `เอกสาร invoice_page-0051.jpg` | INVOICE | 139,169.55 |
| `เอกสาร invoice_page-0052.jpg` | INVOICE | 53,286.00 |
| `เอกสาร invoice_page-0053.jpg` | UNKNOWN | 30,880.20 |
| `เอกสาร invoice_page-0054.jpg` | INVOICE | 7,383.00 |
| `เอกสาร invoice_page-0055.jpg` | UNKNOWN | 18,992.50 |
| `เอกสาร invoice_page-0056.jpg` | INVOICE | 8,950.55 |
| `เอกสาร invoice_page-0057.jpg` | INVOICE | 11,770.00 |
| `เอกสาร invoice_page-0058.jpg` | INVOICE | 6,779.52 |
| `เอกสาร invoice_page-0060.jpg` | INVOICE | 7,757.50 |
| `เอกสาร invoice_page-0059.jpg` | UNKNOWN | 5,343.58 |
| `เอกสาร invoice_page-0061.jpg` | INVOICE | 9,539.48 |
| `เอกสาร invoice_page-0062.jpg` | INVOICE | 56,778.48 |
| `เอกสาร invoice_page-0063.jpg` | INVOICE | 15,238.51 |
| `เอกสาร invoice_page-0065.jpg` | INVOICE | 34,775.00 |
| `เอกสาร invoice_page-0066.jpg` | UNKNOWN | 47,080.00 |
| `เอกสาร invoice_page-0068.jpg` | INVOICE | 9,630.00 |
| `เอกสาร invoice_page-0070.jpg` | INVOICE | 3,210.00 |
| `เอกสาร invoice_page-0069.jpg` | INVOICE | 27,020.76 |
| `เอกสาร invoice_page-0072.jpg` | INVOICE | 3,210.00 |
| `เอกสาร invoice_page-0071.jpg` | INVOICE | 4,486.58 |
| `เอกสาร invoice_page-0073.jpg` | INVOICE | 2,407.50 |
| `เอกสาร invoice_page-0074.jpg` | INVOICE | 6,730.30 |
| `เอกสาร invoice_page-0075.jpg` | UNKNOWN | 55,212.00 |
| `เอกสาร invoice_page-0077.jpg` | INVOICE | 16,237.57 |
| `เอกสาร invoice_page-0078.jpg` | INVOICE | 10,863.50 |
| `เอกสาร invoice_page-0080.jpg` | UNKNOWN | 10,015.20 |
| `เอกสาร invoice_page-0084.jpg` | UNKNOWN | 29,392.90 |
| `เอกสาร invoice_page-0085.jpg` | INVOICE | 4,601.00 |
| `เอกสาร invoice_page-0086.jpg` | UNKNOWN | 988.68 |
| `เอกสาร invoice_page-0087.jpg` | UNKNOWN | 14,552.00 |
| `เอกสาร invoice_page-0089.jpg` | INVOICE | 43,335.00 |
| `เอกสาร invoice_page-0093.jpg` | INVOICE | 35,180.66 |
| `เอกสาร invoice_page-0092.jpg` | INVOICE | 5,296.50 |
| `เอกสาร invoice_page-0091.jpg` | INVOICE | 31,200.00 |
| `เอกสาร invoice_page-0094.jpg` | INVOICE | 3,210.00 |
| `เอกสาร invoice_page-0095.jpg` | INVOICE | 5,037.98 |
| `เอกสาร invoice_page-0096.jpg` | INVOICE | 3,210.00 |
| `เอกสาร invoice_page-0097.jpg` | INVOICE | 9,074.67 |
| `เอกสาร invoice_page-0098.jpg` | INVOICE | 5,184.15 |
| `เอกสาร invoice_page-0101.jpg` | UNKNOWN | 1,262.60 |
| `เอกสาร invoice_page-0102.jpg` | INVOICE | 61,535.70 |
| `เอกสาร invoice_page-0103.jpg` | INVOICE | 46,224.00 |
| `เอกสาร invoice_page-0105.jpg` | INVOICE | 3,766.74 |
| `เอกสาร invoice_page-0106.jpg` | INVOICE | 18,420.46 |
| `เอกสาร invoice_page-0107.jpg` | INVOICE | 36,380.00 |
| `เอกสาร invoice_page-0108.jpg` | INVOICE | 119,840.00 |
| `เอกสาร invoice_page-0109.jpg` | INVOICE | 6,152.50 |
| `เอกสาร invoice_page-0110.jpg` | UNKNOWN | 1,498.00 |
| `เอกสาร invoice_page-0112.jpg` | INVOICE | 47,080.00 |
| `เอกสาร invoice_page-0113.jpg` | INVOICE | 44,284.63 |
| `เอกสาร invoice_page-0114.jpg` | UNKNOWN | 184.25 |
| `เอกสาร invoice_page-0115.jpg` | INVOICE | 119,840.00 |
| `เอกสาร invoice_page-0117.jpg` | INVOICE | 3,959.00 |
| `เอกสาร invoice_page-0116.jpg` | UNKNOWN | 19,527.50 |
| `เอกสาร invoice_page-0120.jpg` | INVOICE | 2,867.60 |
| `เอกสาร invoice_page-0119.jpg` | INVOICE | 47,700.60 |
| `เอกสาร invoice_page-0118.jpg` | INVOICE | 33,005.76 |
| `เอกสาร invoice_page-0121.jpg` | UNKNOWN | 4,643.80 |
| `เอกสาร invoice_page-0122.jpg` | INVOICE | 2,311.20 |
| `เอกสาร invoice_page-0124.jpg` | INVOICE | 32,953.00 |
| `เอกสาร invoice_page-0125.jpg` | UNKNOWN | 5,287.26 |
| `เอกสาร invoice_page-0127.jpg` | INVOICE | 856.00 |
| `เอกสาร invoice_page-0130.jpg` | INVOICE | 1,765.50 |
| `เอกสาร invoice_page-0128.jpg` | INVOICE | 55,902.15 |
| `เอกสาร invoice_page-0131.jpg` | INVOICE | 2,131.44 |
| `เอกสาร invoice_page-0129.jpg` | INVOICE | 40,762.87 |
| `เอกสาร invoice_page-0135.jpg` | INVOICE | 2,728.50 |
| `เอกสาร invoice_page-0136.jpg` | INVOICE | 3,579.15 |
| `เอกสาร invoice_page-0137.jpg` | UNKNOWN | 3,632.65 |
| `เอกสาร invoice_page-0138.jpg` | INVOICE | 163,742.10 |
| `เอกสาร invoice_page-0139.jpg` | INVOICE | 26,643.00 |
| `เอกสาร invoice_page-0140.jpg` | INVOICE | 13,482.00 |
| `เอกสาร invoice_page-0141.jpg` | INVOICE | 6,480.00 |
| `เอกสาร invoice_page-0143.jpg` | UNKNOWN | 3,156.50 |
| `เอกสาร invoice_page-0145.jpg` | INVOICE | 70,005.40 |
| `เอกสาร invoice_page-0144.jpg` | INVOICE | 45,660.75 |
| `เอกสาร invoice_page-0146.jpg` | UNKNOWN | 5,036.00 |
| `เอกสาร invoice_page-0148.jpg` | INVOICE | 1,177.00 |
| `เอกสาร invoice_page-0147.jpg` | INVOICE | 8,782.56 |
| `เอกสาร invoice_page-0150.jpg` | INVOICE | 5,564.00 |
| `เอกสาร invoice_page-0151.jpg` | UNKNOWN | 7,169.00 |
| `เอกสาร invoice_page-0149.jpg` | INVOICE | 20,939.90 |
| `เอกสาร invoice_page-0152.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0153.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0154.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0155.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0158.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0156.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0157.jpg` | UNKNOWN | 6,955.00 |
| `เอกสาร invoice_page-0160.jpg` | INVOICE | 96,300.00 |
| `เอกสาร invoice_page-0161.jpg` | UNKNOWN | 101,371.80 |
| `เอกสาร invoice_page-0162.jpg` | UNKNOWN | 36,380.00 |
| `เอกสาร invoice_page-0163.jpg` | INVOICE | 84,499.93 |
| `เอกสาร invoice_page-0164.jpg` | INVOICE | 45,293.10 |
| `เอกสาร invoice_page-0166.jpg` | INVOICE | 23,421.38 |
| `เอกสาร invoice_page-0167.jpg` | INVOICE | 2,503.80 |
| `เอกสาร invoice_page-0170.jpg` | INVOICE | 30,816.00 |
| `เอกสาร invoice_page-0168.jpg` | UNKNOWN | 4,708.00 |
| `เอกสาร invoice_page-0169.jpg` | INVOICE | 72,920.50 |
| `เอกสาร invoice_page-0171.jpg` | INVOICE | 36,221.64 |
| `เอกสาร invoice_page-0172.jpg` | INVOICE | 21,129.29 |
| `เอกสาร invoice_page-0173.jpg` | INVOICE | 203,728.00 |
| `เอกสาร invoice_page-0174.jpg` | INVOICE | 15,515.00 |
| `เอกสาร invoice_page-0176.jpg` | INVOICE | 13,951.17 |
| `เอกสาร invoice_page-0175.jpg` | INVOICE | 29,234.37 |
| `เอกสาร invoice_page-0179.jpg` | INVOICE | 12,201.21 |
| `เอกสาร invoice_page-0178.jpg` | INVOICE | 5,116.10 |
| `เอกสาร invoice_page-0177.jpg` | INVOICE | 11,115.76 |
| `เอกสาร invoice_page-0182.jpg` | INVOICE | 6,200.65 |
| `เอกสาร invoice_page-0181.jpg` | INVOICE | 3,081.60 |
| `เอกสาร invoice_page-0180.jpg` | UNKNOWN | 7,472.88 |
| `เอกสาร invoice_page-0185.jpg` | INVOICE | 54,961.19 |
| `เอกสาร invoice_page-0183.jpg` | INVOICE | 9,565.80 |
| `เอกสาร invoice_page-0186.jpg` | DELIVERY_ORDER | 31,779.00 |
| `เอกสาร invoice_page-0188.jpg` | INVOICE | 26,367.18 |
| `เอกสาร invoice_page-0187.jpg` | DELIVERY_ORDER | 139,100.00 |
| `เอกสาร invoice_page-0191.jpg` | INVOICE | 53,286.00 |
| `เอกสาร invoice_page-0189.jpg` | INVOICE | 15,015.46 |
| `เอกสาร invoice_page-0190.jpg` | INVOICE | 12,549.05 |
| `เอกสาร invoice_page-0194.jpg` | INVOICE | 14,980.00 |
| `เอกสาร invoice_page-0197.jpg` | INVOICE | 4,066.00 |
| `เอกสาร invoice_page-0198.jpg` | INVOICE | 3,852.00 |
| `เอกสาร invoice_page-0199.jpg` | INVOICE | 79,180.00 |
| `เอกสาร invoice_page-0200.jpg` | INVOICE | 6,741.00 |
| `เอกสาร invoice_page-0201.jpg` | INVOICE | 7,918.00 |
| `เอกสาร invoice_page-0202.jpg` | INVOICE | 95,016.00 |
| `เอกสาร invoice_page-0203.jpg` | INVOICE | 190,032.00 |

</details>

## 8. สถิติยอดเงิน

| | ค่า (฿) |
|---|---|
| ยอดรวมทั้งหมด | 7,998,259.15 |
| เฉลี่ย/เอกสาร | 39,400.29 |
| Median | 14,980.00 |
| ต่ำสุด | 184.25 |
| สูงสุด | 722,250.00 |
