const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const multer = require('multer');
const { spawn } = require('child_process');
const sharp = require('sharp');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// 临时文件目录
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// URL缓存映射：urlHash -> sessionId（仅图片模式）
const urlCache = new Map();

// 存储会话数据
const sessions = new Map();

// 生成 URL hash
function getUrlHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

// 清理过期文件（10分钟）
const CLEANUP_INTERVAL = 10 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    
    // 清理过期会话
    for (const [sessionId, data] of sessions.entries()) {
        if (now - data.createdAt > CLEANUP_INTERVAL) {
            const sessionDir = path.join(TEMP_DIR, sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            sessions.delete(sessionId);
            console.log(`[CLEANUP] 清理过期会话: ${sessionId}`);
        }
    }
    
    // 清理过期URL缓存（跟随会话一起清理，10分钟）
    for (const [urlHash, cacheData] of urlCache.entries()) {
        if (now - cacheData.createdAt > CLEANUP_INTERVAL) {
            urlCache.delete(urlHash);
            console.log(`[CACHE] 清理过期URL缓存: ${urlHash}`);
        }
    }
}, 60000);

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

// 下载单张图片
async function downloadImage(url, targetPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadImage(response.headers.location, targetPath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            const writer = fs.createWriteStream(targetPath);
            response.pipe(writer);
            writer.on('finish', () => {
                const stats = fs.statSync(targetPath);
                resolve({ path: targetPath, size: stats.size, url: url });
            });
            writer.on('error', reject);
        }).on('error', reject);
    });
}

app.get('/health', (req, res) => { res.json({ status: 'ok' }); });

app.get('/api/fetch-page', async (req, res) => {
    let url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 2000));
        const html = await page.content();
        const title = await page.title();
        const images = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.filter(img => img.src && img.naturalWidth > 50).map(img => ({ src: img.src, alt: img.alt || img.title || '图片' })).slice(0, 50);
        });
        await page.close();
        res.json({ html, url, title: title || new URL(url).hostname, images, has_incomplete_content: false, warning: null });
    } catch (error) {
        console.error('Fetch page error:', error);
        res.status(500).json({ error: `获取网页失败: ${error.message}` });
    }
});

app.post('/api/download-images', async (req, res) => {
    const { url, images, skipCache } = req.body;
    if (!url || !images || !Array.isArray(images)) return res.status(400).json({ error: 'Missing url or images parameter' });
    
    try {
        // 检查 URL 缓存（除非用户要求跳过）
        const urlHash = getUrlHash(url);
        
        if (!skipCache && urlCache.has(urlHash)) {
            const cachedData = urlCache.get(urlHash);
            const cachedSessionId = cachedData.sessionId;
            const cachedSession = sessions.get(cachedSessionId);
            
            // 验证缓存会话是否有效
            if (cachedSession && fs.existsSync(cachedSession.dir)) {
                console.log(`[CACHE] 使用缓存会话: ${cachedSessionId} (URL: ${url.substring(0, 50)}...)`);
                // 直接返回缓存会话的图片
                res.json({
                    sessionId: cachedSessionId,
                    images: cachedSession.images,
                    expiresAt: cachedSession.createdAt + CLEANUP_INTERVAL,
                    cached: true
                });
                return;
            } else {
                // 缓存失效，清理
                urlCache.delete(urlHash);
                console.log(`[CACHE] 缓存会话失效，清理: ${cachedSessionId}`);
            }
        }
        
        // 跳过缓存或无缓存，创建新会话并下载图片
        if (skipCache) {
            console.log(`[CACHE] 跳过缓存，重新下载 (URL: ${url.substring(0, 50)}...)`);
        }
        
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const sessionDir = path.join(TEMP_DIR, sessionId);
        fs.mkdirSync(sessionDir, { recursive: true });
        
        sessions.set(sessionId, { createdAt: Date.now(), url, dir: sessionDir, images: [] });
        
        // 记录 URL 缓存映射
        urlCache.set(urlHash, { sessionId, createdAt: Date.now(), url });
        console.log(`[CACHE] 新建会话: ${sessionId} (URL: ${url.substring(0, 50)}...)`);
        
        const downloadedImages = [];
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            try {
                const ext = path.extname(new URL(img.src).pathname) || '.jpg';
                const filename = `${i + 1}${ext}`;
                const filePath = path.join(sessionDir, filename);
                const result = await downloadImage(img.src, filePath);
                downloadedImages.push({ id: `${sessionId}-${i}`, filename, alt: img.alt || '图片', url: img.src, size: result.size, path: `/api/temp/${sessionId}/${filename}`, index: i });
            } catch (error) {
                console.error(`下载图片失败: ${img.src}`, error.message);
                downloadedImages.push({ id: `${sessionId}-${i}`, filename: `${i + 1}.jpg`, alt: img.alt || '图片', url: img.src, size: 0, path: null, index: i, error: error.message });
            }
        }
        sessions.get(sessionId).images = downloadedImages;
        res.json({ sessionId, images: downloadedImages, expiresAt: sessions.get(sessionId).createdAt + CLEANUP_INTERVAL, cached: false });
    } catch (error) {
        console.error('Download images error:', error);
        res.status(500).json({ error: `下载图片失败: ${error.message}` });
    }
});

app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: '会话不存在或已过期' });
    res.json({ sessionId: req.params.sessionId, images: session.images, expiresAt: session.createdAt + CLEANUP_INTERVAL });
});

app.get('/api/temp/:sessionId/:filename', (req, res) => {
    const filePath = path.join(TEMP_DIR, req.params.sessionId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
    res.sendFile(filePath);
});

app.post('/api/generate-images-pdf', async (req, res) => {
    const { sessionId, selectedImages } = req.body;
    if (!sessionId || !selectedImages || !Array.isArray(selectedImages)) return res.status(400).json({ error: 'Missing sessionId or selectedImages' });
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: '会话不存在或已过期' });
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        // 样式：横版图片使用横向页面，竖版图片使用纵向页面
        let htmlContent = '<!DOCTYPE html><html><head><style>@page { margin: 0; }body { margin: 0; padding: 0; background: white; }.img-page { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; page-break-after: always; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 100%; object-fit: contain; }</style></head><body>';
        
        for (const img of selectedImages) {
            const imgPath = path.join(TEMP_DIR, sessionId, img.filename);
            if (fs.existsSync(imgPath)) {
                try {
                    // 读取图片并获取元数据
                    const imageBuffer = fs.readFileSync(imgPath);
                    const metadata = await sharp(imageBuffer).metadata();
                    
                    let processedBuffer = imageBuffer;
                    let isLandscape = metadata.width > metadata.height;
                    
                    // 如果是横版图片，旋转90度变成竖版
                    if (isLandscape) {
                        processedBuffer = await sharp(imageBuffer)
                            .rotate(90)  // 旋转90度
                            .toBuffer();
                    }
                    
                    const imgData = processedBuffer.toString('base64');
                    const ext = path.extname(img.filename).toLowerCase();
                    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
                    htmlContent += `<div class="img-page"><img src="data:${mimeType};base64,${imgData}" alt="${img.alt || ''}" /></div>`;
                } catch (imgError) {
                    console.error(`处理图片失败: ${img.filename}`, imgError.message);
                    // 如果处理失败，使用原始图片
                    const imgData = fs.readFileSync(imgPath).toString('base64');
                    const ext = path.extname(img.filename).toLowerCase();
                    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
                    htmlContent += `<div class="img-page"><img src="data:${mimeType};base64,${imgData}" alt="${img.alt || ''}" /></div>`;
                }
            }
        }
        htmlContent += '</body></html>';
        await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        const pdf = await page.pdf({ format: 'A4', printBackground: false, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
        await page.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="selected-images.pdf"');
        res.send(pdf);
    } catch (error) {
        console.error('Generate images PDF error:', error);
        res.status(500).json({ error: `PDF生成失败: ${error.message}` });
    }
});

app.post('/api/generate-pdf', async (req, res) => {
    let url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    const mode = req.query.mode || 'full';
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 2000));
        let pdf;
        if (mode === 'images') {
            await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img')).filter(img => img.src && img.naturalWidth > 50);
                document.body.innerHTML = '';
                document.body.style.margin = '0'; document.body.style.padding = '0'; document.body.style.background = 'white';
                const style = document.createElement('style');
                style.textContent = `@page { size: A4; margin: 1cm; }.img-page { width: 100%; min-height: 277mm; display: flex; align-items: center; justify-content: center; page-break-after: always; padding: 1cm; box-sizing: border-box; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 277mm; object-fit: contain; }`;
                document.head.appendChild(style);
                images.forEach(img => { const div = document.createElement('div'); div.className = 'img-page'; const newImg = document.createElement('img'); newImg.src = img.src; newImg.alt = img.alt || ''; div.appendChild(newImg); document.body.appendChild(div); });
            });
            await page.evaluate(async () => { const images = Array.from(document.querySelectorAll('img')); await Promise.all(images.map(img => { if (img.complete) return Promise.resolve(); return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 15000); }); })); });
            await new Promise(r => setTimeout(r, 5000));
            pdf = await page.pdf({ format: 'A4', printBackground: false, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
        } else {
            pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
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

// ========== 水印相关 ==========
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// 检测水印
app.post('/api/detect-watermark', upload.single('image'), (req, res) => {
    const imageFile = req.file;
    if (!imageFile) return res.status(400).json({ error: '缺少图片文件' });
    const pythonScript = path.join(__dirname, 'script', 'inpaint.py');
    const maskFile = path.join(__dirname, 'uploads', `mask_${Date.now()}.png`);
    const pythonProcess = spawn('python3', [pythonScript, 'detect', imageFile.path, maskFile]);
    let stdout = '', stderr = '';
    pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });
    pythonProcess.on('close', (code) => {
        try { fs.unlinkSync(imageFile.path); } catch (e) {}
        if (code !== 0 || !fs.existsSync(maskFile)) {
            console.error('Watermark detection failed:', stderr);
            return res.status(500).json({ error: `检测失败: ${stderr || '未知错误'}` });
        }
        const maskData = fs.readFileSync(maskFile);
        const maskBase64 = maskData.toString('base64');
        try { fs.unlinkSync(maskFile); } catch (e) {}
        res.json({ mask: maskBase64 });
    });
});

// 去除水印
app.post('/api/remove-watermark', upload.fields([{ name: 'image' }, { name: 'mask' }]), (req, res) => {
    const imageFile = req.files['image']?.[0];
    const maskFile = req.files['mask']?.[0];
    if (!imageFile || !maskFile) return res.status(400).json({ error: '缺少图片或蒙版文件' });
    const outputDir = path.join(__dirname, 'temp-watermark');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, `${Date.now()}-result.png`);
    const pythonScript = path.join(__dirname, 'script', 'inpaint.py');
    const pythonProcess = spawn('python3', [pythonScript, 'remove', imageFile.path, maskFile.path, outputFile]);
    let stdout = '', stderr = '';
    pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });
    pythonProcess.on('close', (code) => {
        try { fs.unlinkSync(imageFile.path); } catch (e) {}
        try { fs.unlinkSync(maskFile.path); } catch (e) {}
        if (code !== 0 || !fs.existsSync(outputFile)) {
            console.error('Python inpaint failed:', stderr);
            return res.status(500).json({ error: `去水印失败: ${stderr || '未知错误'}` });
        }
        const resultBuffer = fs.readFileSync(outputFile);
        res.setHeader('Content-Type', 'image/png');
        res.send(resultBuffer);
        setTimeout(() => { try { fs.unlinkSync(outputFile); } catch (e) {} }, 60000);
    });
});

// ========== 去背景 ==========
const removeBgScript = path.join(__dirname, 'script', 'remove-bg.py');

app.post('/api/remove-background', upload.single('file'), (req, res) => {
    const imageFile = req.file;
    if (!imageFile) return res.status(400).json({ error: '缺少图片文件' });
    
    const outputDir = path.join(__dirname, 'temp-bg');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, `${Date.now()}-no-bg.png`);
    
    console.log('[BG] 开始去背景处理:', imageFile.originalname);
    
    const pythonProcess = spawn('python3', [removeBgScript, imageFile.path, outputFile]);
    let stdout = '', stderr = '';
    
    pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });
    
    pythonProcess.on('close', (code) => {
        // 清理输入文件
        try { fs.unlinkSync(imageFile.path); } catch (e) {}
        
        if (code !== 0 || !fs.existsSync(outputFile)) {
            console.error('[BG] 去背景失败:', stderr);
            return res.status(500).json({ error: `去背景失败: ${stderr || '未知错误'}` });
        }
        
        console.log('[BG] 去背景成功:', outputFile);
        const resultBuffer = fs.readFileSync(outputFile);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename="no-bg.png"');
        res.send(resultBuffer);
        
        // 1分钟后清理输出文件
        setTimeout(() => { try { fs.unlinkSync(outputFile); } catch (e) {} }, 60000);
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on http://0.0.0.0:${PORT}`); });

process.on('SIGINT', async () => { if (browser) await browser.close(); process.exit(0); });
process.on('SIGTERM', async () => { if (browser) await browser.close(); process.exit(0); });