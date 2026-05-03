const cheerio = require('cheerio');

/**
 * Extracts rich metadata from an HTML string.
 * @param {string} html
 * @param {string} baseUrl
 * @returns {Object} metadata
 */
function extractMetadata(html, baseUrl) {
  if (!html || typeof html !== 'string') return {};

  const $ = cheerio.load(html);

  // Helpers
  const getMeta = (name) =>
    $(`meta[name="${name}"]`).attr('content') ||
    $(`meta[property="${name}"]`).attr('content') ||
    null;

  const getOg = (property) =>
    $(`meta[property="og:${property}"]`).attr('content') ||
    $(`meta[name="og:${property}"]`).attr('content') ||
    null;

  const getTwitter = (name) =>
    $(`meta[name="twitter:${name}"]`).attr('content') || null;

  // Title (priority: og:title > twitter:title > <title>)
  const ogTitle = getOg('title') || getTwitter('title');
  const pageTitle = $('title').first().text().trim() || null;
  const title = ogTitle || pageTitle;

  // Description
  const ogDescription = getOg('description') || getTwitter('description');
  const metaDescription = getMeta('description');
  const description = ogDescription || metaDescription;

  // OG Image (resolve to absolute URL)
  let ogImage = getOg('image') || getTwitter('image') || null;
  if (ogImage && ogImage.startsWith('/')) {
    try {
      const base = new URL(baseUrl);
      ogImage = `${base.protocol}//${base.host}${ogImage}`;
    } catch {}
  }

  // Site name
  const siteName = getOg('site_name') || null;

  // Favicon
  let favicon = null;
  const faviconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ];

  for (const sel of faviconSelectors) {
    const href = $(sel).first().attr('href');
    if (href) {
      if (href.startsWith('http')) {
        favicon = href;
      } else if (href.startsWith('//')) {
        favicon = 'https:' + href;
      } else if (href.startsWith('/')) {
        try {
          const base = new URL(baseUrl);
          favicon = `${base.protocol}//${base.host}${href}`;
        } catch {}
      } else {
        try {
          favicon = new URL(href, baseUrl).toString();
        } catch {}
      }
      break;
    }
  }

  // Fallback: /favicon.ico
  if (!favicon) {
    try {
      const base = new URL(baseUrl);
      favicon = `${base.protocol}//${base.host}/favicon.ico`;
    } catch {}
  }

  // Additional meta
  const keywords = getMeta('keywords') || null;
  const author = getMeta('author') || null;
  const themeColor = getMeta('theme-color') || null;
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const language = $('html').attr('lang') || getMeta('language') || null;

  // Structured data (JSON-LD)
  let jsonLd = null;
  try {
    const ldScript = $('script[type="application/ld+json"]').first().html();
    if (ldScript) jsonLd = JSON.parse(ldScript);
  } catch {}

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    siteName,
    favicon,
    keywords,
    author,
    themeColor,
    canonical,
    language,
    jsonLd,
  };
}

module.exports = { extractMetadata };
