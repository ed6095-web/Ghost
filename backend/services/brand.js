const cheerio = require('cheerio');

/**
 * Parses HTML to extract dominant colors and fonts used in <style> and inline styles.
 * Note: This is a fast regex-based extractor, not a headless browser computed style parser.
 * @param {string} html 
 * @returns {{ fonts: string[], colors: string[] }}
 */
function extractBrandAssets(html) {
  if (!html) return { fonts: [], colors: [] };
  
  const $ = cheerio.load(html);
  let cssText = '';

  // Extract <style> tag content
  $('style').each((_, el) => {
    cssText += $(el).html() + ' ';
  });

  // Extract inline styles
  $('[style]').each((_, el) => {
    cssText += $(el).attr('style') + ' ';
  });

  // Regex to find colors (Hex)
  const hexRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;
  const hexMatches = cssText.match(hexRegex) || [];
  
  // Count frequency of hex colors to find dominant ones
  const colorCounts = {};
  for (let hex of hexMatches) {
    hex = hex.toLowerCase();
    // Normalize 3-char hex to 6-char
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    colorCounts[hex] = (colorCounts[hex] || 0) + 1;
  }

  // Sort colors by frequency, filter out pure white/black/grays
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .filter(hex => {
      // Basic filter to ignore common grays/whites if we want mostly brand colors
      // but let's just return the top 5 for now
      return !['#ffffff', '#000000', '#fff', '#000'].includes(hex);
    })
    .slice(0, 5);

  // Regex to find font-family declarations
  // e.g. font-family: 'Inter', sans-serif;
  const fontRegex = /font-family\s*:\s*([^;]+)/ig;
  const fontMatches = [];
  let match;
  while ((match = fontRegex.exec(cssText)) !== null) {
    const rawFonts = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
    fontMatches.push(...rawFonts);
  }

  // Count font frequency
  const fontCounts = {};
  for (let font of fontMatches) {
    if (!font || font.toLowerCase() === 'inherit' || font.toLowerCase() === 'initial') continue;
    fontCounts[font] = (fontCounts[font] || 0) + 1;
  }

  // Filter out generic fallbacks from the top list if possible, or just keep top 3
  const genericFonts = new Set(['sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'Arial', 'Helvetica']);
  
  const sortedFonts = Object.entries(fontCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .filter(font => !genericFonts.has(font))
    .slice(0, 3);
  
  // If no custom fonts found, fallback to system-ui
  if (sortedFonts.length === 0) {
    sortedFonts.push('system-ui');
  }

  // If no colors found, add a fallback
  if (sortedColors.length === 0) {
    sortedColors.push('#3b82f6'); // default blue
  }

  return {
    fonts: sortedFonts,
    colors: sortedColors
  };
}

module.exports = { extractBrandAssets };
