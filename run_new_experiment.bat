@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     Financial OCR — New Experiment (Improved Prompt) ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo [1/3] ติดตั้ง dependencies...
pip install typhoon-ocr requests "httpx[socks]" --break-system-packages -q 2>nul
if errorlevel 1 pip install typhoon-ocr requests "httpx[socks]" -q

echo.
echo [2/3] รันการทดลองใหม่ (204 รูป, 2 รอบ)...
echo       ใช้ prompt ใหม่จาก backend\prompt.txt
echo       ผลจะถูกบันทึกใน report\eval_v3_*.json
echo.
python run_eval_v3.py --rounds 2 --workers 3 --delay 0.3

echo.
echo [3/3] อัปเดตเอกสาร docx ด้วยผลการทดลองใหม่...
python update_docx_results.py

echo.
echo ══════════════════════════════════════════════════════
echo  เสร็จสิ้น! ตรวจสอบไฟล์:
echo    report\eval_v3_*_summary.json  — ผลสรุป
echo    ..\financial-ocr-paper-v2.docx — เอกสารอัปเดตแล้ว
echo ══════════════════════════════════════════════════════
pause
