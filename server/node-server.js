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

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px',
            },
        });

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