import base64
import asyncio
import io
from pathlib import Path
from PIL import Image
from typing import List, Optional
from pydantic import BaseModel

class SelectedImage(BaseModel):
    filename: str
    alt: Optional[str] = ''

class GenerateImagesPdfReq(BaseModel):
    sessionId: str
    selectedImages: List[SelectedImage]

async def create_images_pdf(browser, session_dir: Path, selected_images: List[SelectedImage]) -> bytes:
    page = await browser.new_page()
    
    html_content = '<!DOCTYPE html><html><head><style>@page { margin: 0; }body { margin: 0; padding: 0; background: white; }.img-page { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; page-break-after: always; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 100%; object-fit: contain; }</style></head><body>'
    
    for img in selected_images:
        img_path = session_dir / img.filename
        if img_path.exists():
            try:
                with Image.open(img_path) as pil_img:
                    is_landscape = pil_img.width > pil_img.height
                    if is_landscape:
                        pil_img = pil_img.rotate(-90, expand=True)
                    
                    buf = io.BytesIO()
                    format_str = (pil_img.format or 'JPEG').upper()
                    if format_str not in ['JPEG', 'PNG', 'WEBP']:
                        format_str = 'JPEG'
                    if format_str == 'JPEG' and pil_img.mode in ('RGBA', 'P'):
                        pil_img = pil_img.convert('RGB')
                        
                    pil_img.save(buf, format=format_str)
                    img_data = base64.b64encode(buf.getvalue()).decode('utf-8')
                    ext = img_path.suffix.lower()
                    mime_type = 'image/png' if ext == '.png' else 'image/webp' if ext == '.webp' else 'image/jpeg'
                    html_content += f'<div class="img-page"><img src="data:{mime_type};base64,{img_data}" alt="{img.alt or ""}" /></div>'
            except Exception as e:
                print(f"处理图片失败: {img.filename}", e)
                with open(img_path, "rb") as f:
                    img_data = base64.b64encode(f.read()).decode('utf-8')
                ext = img_path.suffix.lower()
                mime_type = 'image/png' if ext == '.png' else 'image/webp' if ext == '.webp' else 'image/jpeg'
                html_content += f'<div class="img-page"><img src="data:{mime_type};base64,{img_data}" alt="{img.alt or ""}" /></div>'
    
    html_content += '</body></html>'
    
    await page.set_content(html_content, wait_until='networkidle')
    await asyncio.sleep(2)
    
    pdf = await page.pdf(format='A4', print_background=False, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    await page.close()
    return pdf

async def create_webpage_pdf(browser, url: str, mode: str = "full") -> bytes:
    page = await browser.new_page(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    await page.goto(url, wait_until='networkidle', timeout=45000)
    await asyncio.sleep(2)
    
    if mode == 'images':
        await page.evaluate(r'''
            () => {
                const images = Array.from(document.querySelectorAll('img')).filter(img => img.src && img.naturalWidth > 50);
                document.body.innerHTML = '';
                document.body.style.margin = '0'; document.body.style.padding = '0'; document.body.style.background = 'white';
                const style = document.createElement('style');
                style.textContent = `@page { size: A4; margin: 1cm; }.img-page { width: 100%; min-height: 277mm; display: flex; align-items: center; justify-content: center; page-break-after: always; padding: 1cm; box-sizing: border-box; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 277mm; object-fit: contain; }`;
                document.head.appendChild(style);
                images.forEach(img => { const div = document.createElement('div'); div.className = 'img-page'; const newImg = document.createElement('img'); newImg.src = img.src; newImg.alt = img.alt || ''; div.appendChild(newImg); document.body.appendChild(div); });
            }
        ''')
        await page.evaluate(r'''
            async () => {
                const images = Array.from(document.querySelectorAll('img'));
                await Promise.all(images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 15000);
                    });
                }));
            }
        ''')
        await asyncio.sleep(5)
        pdf = await page.pdf(format='A4', print_background=False, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    else:
        pdf = await page.pdf(format='A4', print_background=True, margin={'top': '20px', 'right': '20px', 'bottom': '20px', 'left': '20px'})
        
    await page.close()
    return pdf
