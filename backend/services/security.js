/**
 * Analyzes HTTP response headers for security posture.
 * Returns a risk score and list of individual header checks.
 */

const SECURITY_HEADERS = [
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security (HSTS)',
    description: 'Forces browsers to use HTTPS for future requests.',
    why: 'Prevents man-in-the-middle attacks by ensuring all future communication happens over a secure, encrypted connection.',
    weight: 25,
  },
  {
    key: 'content-security-policy',
    label: 'Content-Security-Policy (CSP)',
    description: 'Controls which resources the browser is allowed to load.',
    why: 'The ultimate defense against Cross-Site Scripting (XSS) and data injection attacks by restricting untrusted scripts.',
    weight: 25,
  },
  {
    key: 'x-frame-options',
    label: 'X-Frame-Options',
    description: 'Prevents the page from being embedded in iframes.',
    why: 'Protects users from Clickjacking—a technique where attackers trick users into clicking something hidden under a transparent layer.',
    weight: 15,
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    description: 'Prevents MIME-type sniffing attacks.',
    why: 'Stops the browser from "guessing" the content type of a file, which could lead to it executing a malicious text file as a script.',
    weight: 15,
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    description: 'Controls how much referrer information is included with requests.',
    why: 'Prevents sensitive data in your URL from being leaked to external websites when you click on their links.',
    weight: 10,
  },
  {
    key: 'permissions-policy',
    label: 'Permissions-Policy',
    description: 'Controls access to browser features like camera and microphone.',
    why: 'Reduces the attack surface by explicitly disabling powerful features that the website shouldn\'t be using.',
    weight: 10,
  },
];

/**
 * @param {Object} headers - Response headers object
 * @param {string} url - Original URL
 * @returns {{ score: string, risk: string, checks: Array, passedCount: number, totalCount: number }}
 */
function analyzeSecurityHeaders(headers, url) {
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers || {})) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  const isHttps = url.startsWith('https://');
  let totalWeight = 0;
  let earnedWeight = 0;

  const checks = SECURITY_HEADERS.map((header) => {
    const value = normalizedHeaders[header.key];
    const present = Boolean(value);

    totalWeight += header.weight;
    if (present) earnedWeight += header.weight;

    return {
      header: header.label,
      key: header.key,
      description: header.description,
      why: header.why,
      present,
      value: present ? String(value).slice(0, 200) : null,
      weight: header.weight,
    };
  });

  // Protocol check
  const protocolCheck = {
    header: 'HTTPS Protocol',
    key: 'protocol',
    description: 'The site uses HTTPS for secure data transmission.',
    present: isHttps,
    value: isHttps ? 'TLS/SSL enabled' : 'HTTP only (insecure)',
    weight: 0, // separate from header scoring
  };

  // Final scoring
  const scorePercent = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const passedCount = checks.filter(c => c.present).length;

  let score, risk;
  if (!isHttps) {
    score = 'CRITICAL';
    risk = 'CRITICAL';
  } else if (scorePercent >= 75) {
    score = 'HIGH';
    risk = 'LOW';
  } else if (scorePercent >= 40) {
    score = 'MEDIUM';
    risk = 'MEDIUM';
  } else {
    score = 'LOW';
    risk = 'HIGH';
  }

  return {
    score,
    risk,
    scorePercent,
    passedCount,
    totalCount: checks.length,
    isHttps,
    checks: [protocolCheck, ...checks],
  };
}

module.exports = { analyzeSecurityHeaders };
