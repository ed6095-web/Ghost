const cheerio = require('cheerio');

const KNOWN_TRACKERS = [
  { regex: /google-analytics\.com|googletagmanager\.com|googleadservices\.com/, name: 'Google Analytics/Ads', category: 'Analytics & Ads' },
  { regex: /connect\.facebook\.net|facebook\.com\/tr|fbq\(/, name: 'Meta Pixel', category: 'Advertising' },
  { regex: /hotjar\.com/, name: 'Hotjar', category: 'Behavioral Analytics' },
  { regex: /tiktok\.com/, name: 'TikTok Pixel', category: 'Advertising' },
  { regex: /ads-twitter\.com|twq\(/, name: 'X / Twitter Pixel', category: 'Advertising' },
  { regex: /linkedin\.com\/px|snap\.licdn\.com/, name: 'LinkedIn Insight Tag', category: 'Advertising' },
  { regex: /segment\.com|cdn\.segment\.com/, name: 'Segment', category: 'Analytics' },
  { regex: /mixpanel\.com/, name: 'Mixpanel', category: 'Analytics' },
  { regex: /sentry-cdn\.com|browser\.sentry-cdn\.com/, name: 'Sentry', category: 'Error Tracking' },
  { regex: /cdn\.amplitude\.com/, name: 'Amplitude', category: 'Analytics' },
  { regex: /cdn\.optimizely\.com/, name: 'Optimizely', category: 'A/B Testing' },
  { regex: /intercomcdn\.com/, name: 'Intercom', category: 'Customer Support' },
  { regex: /clarity\.ms/, name: 'Microsoft Clarity', category: 'Behavioral Analytics' },
  { regex: /static\.cloudflareinsights\.com/, name: 'Cloudflare Insights', category: 'Analytics' },
  { regex: /js-agent\.newrelic\.com/, name: 'New Relic', category: 'Performance' },
  { regex: /browser-intake-datadoghq\.com/, name: 'Datadog', category: 'Performance' },
  { regex: /mc\.yandex\.ru/, name: 'Yandex Metrica', category: 'Analytics' },
  { regex: /s\.pinimg\.com/, name: 'Pinterest Tag', category: 'Advertising' },
  { regex: /sc-static\.net/, name: 'Snapchat Pixel', category: 'Advertising' },
  { regex: /script\.crazyegg\.com/, name: 'Crazy Egg', category: 'Behavioral Analytics' },
  { regex: /dev\.visualwebsiteoptimizer\.com/, name: 'VWO', category: 'A/B Testing' },
  { regex: /bugsnag\.com|d2wy8f7a9ursnm\.cloudfront\.net/, name: 'Bugsnag', category: 'Error Tracking' },
  { regex: /cdn\.heapanalytics\.com/, name: 'Heap', category: 'Analytics' },
  { regex: /logrocket\.io/, name: 'LogRocket', category: 'Behavioral Analytics' }
];

/**
 * Extracts and identifies tracking scripts from HTML
 * @param {string} html 
 * @returns {Array<{name: string, category: string, count: number}>}
 */
function extractTrackers(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  
  const foundTrackers = new Map();

  // Find external scripts
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;

    for (const tracker of KNOWN_TRACKERS) {
      if (tracker.regex.test(src)) {
        const existing = foundTrackers.get(tracker.name) || { name: tracker.name, category: tracker.category, count: 0 };
        existing.count++;
        foundTrackers.set(tracker.name, existing);
      }
    }
  });

  // Find inline scripts (sometimes people inline GTM)
  $('script:not([src])').each((_, el) => {
    const scriptContent = $(el).html() || '';
    if (scriptContent.length > 0) {
      for (const tracker of KNOWN_TRACKERS) {
        if (tracker.regex.test(scriptContent)) {
          const existing = foundTrackers.get(tracker.name) || { name: tracker.name, category: tracker.category, count: 0 };
          existing.count++;
          foundTrackers.set(tracker.name, existing);
        }
      }
    }
  });

  return Array.from(foundTrackers.values());
}

module.exports = { extractTrackers };
