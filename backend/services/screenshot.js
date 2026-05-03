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

// Simple in-memory cache for screenshots
const screenshotCache = new Map();

/**
 * @param {string} url
 * @returns {Promise<{desktop: string, mobile: string}|null>} base64 PNGs or null
 */
async function captureScreenshot(url) {
  if (!puppeteer) return null;

  // Check cache (valid for 1 hour)
  if (screenshotCache.has(url)) {
    const cached = screenshotCache.get(url);
    if (Date.now() - cached.timestamp < 3600000) {
      return cached.data;
    }
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 30000
    });

    const page = await browser.newPage();
    // Set a per-page timeout
    page.setDefaultNavigationTimeout(20000);
    
    // 1. Desktop Capture
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    const desktop = await page.screenshot({ type: 'jpeg', quality: 60 });

    // 2. Mobile Capture
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise(r => setTimeout(r, 1000));
    const mobile = await page.screenshot({ type: 'jpeg', quality: 60 });

    const result = {
      desktop: `data:image/jpeg;base64,${desktop.toString('base64')}`,
      mobile: `data:image/jpeg;base64,${mobile.toString('base64')}`
    };

    // Store in cache
    screenshotCache.set(url, { data: result, timestamp: Date.now() });

    return result;

  } catch (err) {
    console.warn(`[screenshot] Failed to capture ${url}:`, err.message);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[screenshot] Error closing browser:', e.message);
      }
    }
  }
}

module.exports = { captureScreenshot };
