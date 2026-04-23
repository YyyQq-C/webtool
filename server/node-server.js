const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());
app.use(express.json());

let browser = null;

async function getBrowser() {
    if (!browser || !browser.process()) {
        browser = await puppeteer.launch({
            executablePath: '/home/openclaw/.cache/puppeteer/chrome-127.0.6533.88/chrome-linux64/chrome',
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
            ],
        });
    }
    return browser;
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/fetch-page', async (req, res) => {
    let url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const mode = req.query.mode || 'full';

    try {
        const browser = await getBrowser();
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 等待页面加载完成
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 45000,
        });

        // 额外等待渲染
        await new Promise(r => setTimeout(r, 2000));

        // 获取页面内容
        const html = await page.content();
        const title = await page.title();

        // 提取图片
        const images = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
                .filter(img => img.src && img.naturalWidth > 50)
                .map(img => ({
                    src: img.src,
                    alt: img.alt || img.title || '图片',
                }))
                .slice(0, 50);
        });

        await page.close();

        res.json({
            html,
            url,
            title: title || new URL(url).hostname,
            images,
            has_incomplete_content: false,
            warning: null,
        });
    } catch (error) {
        console.error('Fetch page error:', error);
        res.status(500).json({ error: `获取网页失败: ${error.message}` });
    }
});

app.post('/api/generate-pdf', async (req, res) => {
    let url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const mode = req.query.mode || 'full';

    try {
        const browser = await getBrowser();
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 45000,
        });

        await new Promise(r => setTimeout(r, 2000));

        let pdf;

        if (mode === 'images') {
            // 提取图片模式：每页一张图片
            // 方法：直接修改页面 DOM，只保留图片并添加分页
            await page.evaluate(() => {
                // 获取所有图片
                const images = Array.from(document.querySelectorAll('img'))
                    .filter(img => img.src && img.naturalWidth > 50);

                // 清空 body
                document.body.innerHTML = '';
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.background = 'white';

                // 添加样式
                const style = document.createElement('style');
                style.textContent = `
                    @page { size: A4; margin: 1cm; }
                    .img-page {
                        width: 100%;
                        min-height: 277mm; /* A4 height minus margins */
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        page-break-after: always;
                        padding: 1cm;
                        box-sizing: border-box;
                    }
                    .img-page:last-child {
                        page-break-after: auto;
                    }
                    .img-page img {
                        max-width: 100%;
                        max-height: 277mm;
                        object-fit: contain;
                    }
                `;
                document.head.appendChild(style);

                // 创建图片页面
                images.forEach(img => {
                    const div = document.createElement('div');
                    div.className = 'img-page';
                    const newImg = document.createElement('img');
                    newImg.src = img.src;
                    newImg.alt = img.alt || '';
                    div.appendChild(newImg);
                    document.body.appendChild(div);
                });
            });

            // 等待所有新图片加载
            await page.evaluate(async () => {
                const images = Array.from(document.querySelectorAll('img'));
                await Promise.all(images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 15000);
                    });
                }));
            });

            // 额外等待
            await new Promise(r => setTimeout(r, 5000));

            pdf = await page.pdf({
                format: 'A4',
                printBackground: false,
                margin: {
                    top: '0',
                    right: '0',
                    bottom: '0',
                    left: '0',
                },
            });
        } else {
            // 完整页面模式
            pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px',
                },
            });
        }

        await page.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="webpage.pdf"');
        res.send(pdf);
    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({ error: `PDF生成失败: ${error.message}` });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (browser) await browser.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (browser) await browser.close();
    process.exit(0);
});