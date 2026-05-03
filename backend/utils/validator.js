/**
 * URL Validator with SSRF protection.
 * Only allows public HTTP/HTTPS URLs.
 */

// Private IP ranges to block (SSRF prevention)
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,        // Link-local
  /^::1$/,                        // IPv6 loopback
  /^fc00:/i,                      // IPv6 private
  /^fe80:/i,                      // IPv6 link-local
];

// Blocked TLDs / special domains
const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  '169.254.169.254',
  'metadata.aws.internal',
]);

/**
 * @param {string} rawUrl
 * @returns {{ valid: boolean, url?: string, message?: string }}
 */
function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, message: 'URL must be a non-empty string.' };
  }

  let input = rawUrl.trim();

  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(input)) {
    input = 'https://' + input;
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, message: 'Invalid URL format. Please enter a valid web address.' };
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, message: `Protocol "${parsed.protocol}" is not allowed. Only http and https are supported.` };
  }

  const host = parsed.hostname.toLowerCase();

  // Blocked hosts
  if (BLOCKED_HOSTS.has(host)) {
    return { valid: false, message: 'This URL is not publicly accessible.' };
  }

  // SSRF: block private/internal IPs
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(host)) {
      return { valid: false, message: 'Private or internal IP addresses are not allowed.' };
    }
  }

  // Must have a valid TLD or be a real hostname
  const hostParts = host.split('.');
  if (hostParts.length < 2 || hostParts[hostParts.length - 1].length < 2) {
    return { valid: false, message: 'URL must have a valid domain (e.g. example.com).' };
  }

  return { valid: true, url: input };
}

module.exports = { validateUrl };
