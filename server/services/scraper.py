import asyncio
from urllib.parse import urlparse

async def fetch_page_data(browser, url: str) -> dict:
    page = await browser.new_page(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    await page.goto(url, wait_until='networkidle', timeout=45000)
    await asyncio.sleep(2)
    
    html = await page.content()
    title = await page.title()
    
    images = await page.evaluate(r'''
        () => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.filter(img => img.src && img.naturalWidth > 50).map(img => ({
                src: img.src,
                alt: img.alt || img.title || '图片'
            })).slice(0, 50);
        }
    ''')
    
    await page.close()
    domain = urlparse(url).hostname
    
    return {
        "html": html,
        "url": url,
        "title": title or domain,
        "images": list(images),
        "has_incomplete_content": False,
        "warning": None
    }
