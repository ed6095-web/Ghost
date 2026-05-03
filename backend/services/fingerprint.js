/**
 * Ghost Fingerprinting Engine
 * Detects common frameworks and libraries in HTML
 */

const TECH_PATTERNS = [
  { name: 'React', pattern: /react|data-reactroot|_react/i },
  { name: 'Vue.js', pattern: /vue|data-v-|__vue__/i },
  { name: 'Angular', pattern: /ng-app|ng-version|ng-controller/i },
  { name: 'Next.js', pattern: /_next\/static|__NEXT_DATA__/i },
  { name: 'WordPress', pattern: /wp-content|wp-includes|wp-json/i },
  { name: 'Tailwind CSS', pattern: /tailwind\.min\.css/i },
  { name: 'Bootstrap', pattern: /bootstrap\.min\.css|bootstrap\.bundle/i },
  { name: 'jQuery', pattern: /jquery\.min\.js|jquery-[\d.]+\.min/i },
  { name: 'Google Tag Manager', pattern: /googletagmanager\.com/i },
  { name: 'Cloudflare', pattern: /__cf_email__|cloudflare-static/i },
  { name: 'Webflow', pattern: /data-wf-page|data-wf-site/i },
  { name: 'Shopify', pattern: /shopify-features|cdn\.shopify\.com/i }
];

function detectStack(html) {
  const detected = [];
  
  TECH_PATTERNS.forEach(tech => {
    if (tech.pattern.test(html)) {
      detected.push(tech.name);
    }
  });

  return detected;
}

module.exports = { detectStack };
