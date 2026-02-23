from typhoon_ocr import TyphoonOCR

ocr = TyphoonOCR()

async def extract_text(file):
    content = await file.read()
    text = ocr.read(content)
    return text