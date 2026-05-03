const express = require('express');
const router = express.Router();

const { validateUrl } = require('../utils/validator');
const { fetchPage } = require('../services/fetcher');
const { extractMetadata } = require('../services/metadata');
const { analyzeSecurityHeaders } = require('../services/security');
const { classifyWebsite } = require('../services/classifier');
const { captureScreenshot } = require('../services/screenshot');
const { extractTrackers } = require('../services/trackers');
const { calculateCarbonFootprint } = require('../services/eco');
const { extractBrandAssets } = require('../services/brand');
const { addToHistory, getHistory } = require('../utils/history');

/**
 * POST /api/analyze
 * Analyzes a URL and returns structured insights
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate and sanitize URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const cleanUrl = validation.url;
    const startTime = Date.now();

    // Fetch the page
    let fetchResult;
    try {
      fetchResult = await fetchPage(cleanUrl);
    } catch (err) {
      return res.status(422).json({
        error: `Could not reach "${cleanUrl}". ${err.message}`,
        code: err.code || 'FETCH_ERROR'
      });
    }

    const { html, headers, statusCode, responseTime, contentSize, finalUrl } = fetchResult;

    // Run analysis in parallel
    const [metadata, security, screenshot, trackersData, brandData] = await Promise.allSettled([
      Promise.resolve(extractMetadata(html, finalUrl || cleanUrl)),
      Promise.resolve(analyzeSecurityHeaders(headers, finalUrl || cleanUrl)),
      captureScreenshot(finalUrl || cleanUrl),
      Promise.resolve(extractTrackers(html)),
      Promise.resolve(extractBrandAssets(html))
    ]);

    const meta = metadata.status === 'fulfilled' ? metadata.value : {};
    const sec = security.status === 'fulfilled' ? security.value : { score: 'UNKNOWN', checks: [] };
    const shot = screenshot.status === 'fulfilled' ? screenshot.value : null;
    const trackers = trackersData.status === 'fulfilled' ? trackersData.value : [];
    const brand = brandData.status === 'fulfilled' ? brandData.value : { fonts: [], colors: [] };
    
    // Calculate eco
    const eco = calculateCarbonFootprint(contentSize);

    // Classify website
    const category = classifyWebsite(meta.title || '', meta.description || '', cleanUrl);

    // Build response object
    const result = {
      url: finalUrl || cleanUrl,
      analyzedAt: new Date().toISOString(),
      totalTime: Date.now() - startTime,

      // Preview metadata
      preview: {
        title: meta.title || null,
        description: meta.description || null,
        image: meta.ogImage || null,
        favicon: meta.favicon || null,
        siteName: meta.siteName || null,
        ogTitle: meta.ogTitle || null,
        ogDescription: meta.ogDescription || null,
      },

      // Performance
      performance: {
        responseTime,         // ms
        contentSize,          // bytes
        statusCode,
        rating: getPerformanceRating(responseTime, contentSize),
      },

      // Security
      security: {
        protocol: cleanUrl.startsWith('https') ? 'HTTPS' : 'HTTP',
        score: sec.score,
        checks: sec.checks,
        risk: sec.risk,
        scorePercent: sec.scorePercent,
        passedCount: sec.passedCount,
        totalCount: sec.totalCount,
        isHttps: sec.isHttps,
      },

      // Classification
      category,

      // New Interactive Features
      trackers,
      eco,
      brand,

      // Screenshot (base64 PNG or null)
      screenshot: shot,
    };

    // Save to history
    addToHistory({
      url: finalUrl || cleanUrl,
      title: meta.title || cleanUrl,
      favicon: meta.favicon || null,
      category,
      security: sec.risk,
      analyzedAt: result.analyzedAt,
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('[/api/analyze] Error:', err);
    res.status(500).json({ error: 'Internal server error. Please try again.', details: err.message });
  }
});

/**
 * GET /api/history
 * Returns last 20 analyzed URLs
 */
router.get('/history', (req, res) => {
  res.json({ success: true, data: getHistory() });
});

/**
 * DELETE /api/history
 * Clears history
 */
router.delete('/history', (req, res) => {
  const { clearHistory } = require('../utils/history');
  clearHistory();
  res.json({ success: true, message: 'History cleared' });
});

// Helper: compute performance rating
function getPerformanceRating(responseTime, contentSize) {
  let score = 100;
  if (responseTime > 3000) score -= 40;
  else if (responseTime > 1500) score -= 20;
  else if (responseTime > 800) score -= 10;

  if (contentSize > 5_000_000) score -= 30;
  else if (contentSize > 1_000_000) score -= 15;
  else if (contentSize > 500_000) score -= 5;

  if (score >= 80) return 'FAST';
  if (score >= 50) return 'AVERAGE';
  return 'SLOW';
}

module.exports = router;
