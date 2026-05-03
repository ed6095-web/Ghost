const cheerio = require('cheerio');

/**
 * Analyzes page composition and asset distribution
 */
function analyzeAssets(html) {
  const $ = cheerio.load(html);
  
  const images = $('img').length;
  const scripts = $('script').length;
  const styles = $('link[rel="stylesheet"]').length + $('style').length;
  const links = $('a').length;
  
  // Detect external scripts (CDNs, etc)
  let externalScripts = 0;
  $('script[src]').each((i, el) => {
    const src = $(el).attr('src');
    if (src && (src.startsWith('http') || src.startsWith('//'))) {
      externalScripts++;
    }
  });

  // Hidden Issue Detection (Accessibility / Best Practices)
  const missingAlt = $('img:not([alt])').length;
  const inlineStyles = $('[style]').length;

  return {
    counts: {
      images,
      scripts,
      styles,
      links,
      externalScripts
    },
    issues: {
      missingAlt,
      inlineStyles,
      tooManyScripts: scripts > 20,
      tooManyImages: images > 50,
      heavyPage: html.length > 500000 // > 500KB HTML alone is heavy
    }
  };
}

module.exports = { analyzeAssets };
