/**
 * Puppeteer screenshot service.
 * Captures a full-page screenshot and returns it as a base64-encoded PNG.
 * Gracefully falls back to null if Puppeteer is not available or the capture fails.
 */

let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch {
  console.warn('[screenshot] Puppeteer not available — screenshots will be skipped.');
}

/**
 * @param {string} url
 * @returns {Promise<string|null>} base64 PNG string or null
 */
async function captureScreenshot(url) {
  if (!puppeteer) return null;

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block heavy resources to speed up capture
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait a moment for above-the-fold content to render
    await new Promise(resolve => setTimeout(resolve, 1500));

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });

    return `data:image/jpeg;base64,${screenshot.toString('base64')}`;

  } catch (err) {
    console.warn(`[screenshot] Failed to capture ${url}:`, err.message);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

module.exports = { captureScreenshot };
