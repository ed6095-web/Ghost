const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Fetch a URL and return HTML, headers, timing, and size.
 * @param {string} url
 * @returns {Promise<{html, headers, statusCode, responseTime, contentSize, finalUrl}>}
 */
async function fetchPage(url) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      responseType: 'text',
      validateStatus: (status) => status < 500,
    });

    const responseTime = Date.now() - startTime;
    const html = response.data || '';
    const contentLength = response.headers['content-length'];
    const contentSize = contentLength
      ? parseInt(contentLength, 10)
      : Buffer.byteLength(html, 'utf8');

    return {
      html,
      headers: response.headers,
      statusCode: response.status,
      responseTime,
      contentSize,
      finalUrl: response.request?.res?.responseUrl || url,
    };

  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      throw Object.assign(new Error(`DNS lookup failed — the domain does not exist or is unreachable.`), { code: 'DNS_ERROR' });
    }
    if (err.code === 'ECONNREFUSED') {
      throw Object.assign(new Error(`Connection refused by the server.`), { code: 'CONN_REFUSED' });
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      throw Object.assign(new Error(`Request timed out after 12 seconds.`), { code: 'TIMEOUT' });
    }
    if (err.response) {
      // Server responded with 5xx
      throw Object.assign(new Error(`Server returned ${err.response.status}`), { code: 'SERVER_ERROR' });
    }
    throw err;
  }
}

module.exports = { fetchPage };
