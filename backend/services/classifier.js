/**
 * Classifies a website into a category based on keyword matching
 * against its title, description, and domain.
 */

const CATEGORIES = [
  {
    name: 'Social Media',
    icon: '💬',
    color: '#8B5CF6',
    keywords: ['social', 'network', 'connect', 'friends', 'follow', 'tweet', 'post', 'share', 'community', 'profile', 'feed', 'story', 'chat', 'message', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'snapchat', 'discord', 'reddit'],
    domains: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'discord.com', 'reddit.com', 'pinterest.com', 'tumblr.com'],
  },
  {
    name: 'Education',
    icon: '🎓',
    color: '#06B6D4',
    keywords: ['learn', 'course', 'tutorial', 'education', 'school', 'university', 'college', 'study', 'teaching', 'lesson', 'lecture', 'academic', 'certificate', 'degree', 'knowledge', 'skill', 'training'],
    domains: ['coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'duolingo.com', 'academia.edu', 'scholar.google.com'],
  },
  {
    name: 'News',
    icon: '📰',
    color: '#F59E0B',
    keywords: ['news', 'breaking', 'headline', 'report', 'journalist', 'press', 'media', 'article', 'story', 'politics', 'world', 'business', 'economy', 'sports', 'weather'],
    domains: ['bbc.com', 'cnn.com', 'reuters.com', 'nytimes.com', 'theguardian.com', 'washingtonpost.com', 'bloomberg.com', 'ap.org', 'aljazeera.com'],
  },
  {
    name: 'Entertainment',
    icon: '🎬',
    color: '#EC4899',
    keywords: ['movie', 'film', 'music', 'video', 'game', 'play', 'watch', 'stream', 'entertainment', 'show', 'series', 'anime', 'manga', 'comedy', 'drama', 'podcast', 'episode', 'season'],
    domains: ['netflix.com', 'youtube.com', 'spotify.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'imdb.com', 'steam.com', 'epicgames.com'],
  },
  {
    name: 'Technology',
    icon: '💻',
    color: '#10B981',
    keywords: ['tech', 'software', 'developer', 'code', 'programming', 'api', 'cloud', 'ai', 'machine learning', 'startup', 'saas', 'app', 'platform', 'open source', 'github', 'npm', 'linux', 'docker'],
    domains: ['github.com', 'stackoverflow.com', 'dev.to', 'hackernews.com', 'producthunt.com', 'techcrunch.com', 'vercel.com', 'netlify.com', 'aws.amazon.com', 'cloud.google.com'],
  },
  {
    name: 'Shopping',
    icon: '🛍️',
    color: '#F97316',
    keywords: ['shop', 'buy', 'store', 'price', 'product', 'cart', 'checkout', 'deal', 'discount', 'sale', 'order', 'shipping', 'ecommerce', 'marketplace', 'brand', 'fashion', 'clothing'],
    domains: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com', 'walmart.com', 'target.com', 'alibaba.com', 'aliexpress.com'],
  },
  {
    name: 'Health',
    icon: '🏥',
    color: '#EF4444',
    keywords: ['health', 'medical', 'doctor', 'hospital', 'medicine', 'wellness', 'fitness', 'nutrition', 'diet', 'mental health', 'therapy', 'symptoms', 'treatment', 'clinic', 'pharmacy'],
    domains: ['webmd.com', 'healthline.com', 'mayoclinic.org', 'medlineplus.gov', 'nih.gov'],
  },
  {
    name: 'Finance',
    icon: '💰',
    color: '#84CC16',
    keywords: ['finance', 'bank', 'invest', 'stock', 'crypto', 'bitcoin', 'money', 'loan', 'credit', 'insurance', 'mortgage', 'tax', 'budget', 'portfolio', 'trading', 'wallet'],
    domains: ['paypal.com', 'coinbase.com', 'binance.com', 'robinhood.com', 'bloomberg.com/markets', 'investing.com', 'yahoo.com/finance'],
  },
  {
    name: 'Government',
    icon: '🏛️',
    color: '#64748B',
    keywords: ['government', 'official', 'ministry', 'department', 'public', 'policy', 'law', 'regulation', 'federal', 'state', 'municipality', 'citizen', 'service'],
    domains: [],
    domainPatterns: ['.gov', '.gov.uk', '.gov.in', '.gc.ca', '.gov.au'],
  },
];

const DEFAULT_CATEGORY = {
  name: 'General',
  icon: '🌐',
  color: '#6366F1',
};

/**
 * @param {string} title
 * @param {string} description
 * @param {string} url
 * @returns {{ name, icon, color, confidence }}
 */
function classifyWebsite(title = '', description = '', url = '') {
  const text = `${title} ${description} ${url}`.toLowerCase();
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {}

  let bestMatch = null;
  let bestScore = 0;

  for (const category of CATEGORIES) {
    let score = 0;

    // Domain exact match (highest confidence)
    if (category.domains && category.domains.some(d => domain === d || domain.endsWith('.' + d))) {
      score += 100;
    }

    // Domain pattern match (e.g. .gov)
    if (category.domainPatterns) {
      for (const pattern of category.domainPatterns) {
        if (domain.endsWith(pattern)) {
          score += 80;
          break;
        }
      }
    }

    // Keyword matching
    for (const keyword of category.keywords) {
      if (text.includes(keyword)) {
        score += keyword.length > 5 ? 3 : 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  if (!bestMatch || bestScore < 2) {
    return { ...DEFAULT_CATEGORY, confidence: 'low' };
  }

  const confidence = bestScore >= 100 ? 'high' : bestScore >= 10 ? 'medium' : 'low';
  return {
    name: bestMatch.name,
    icon: bestMatch.icon,
    color: bestMatch.color,
    confidence,
  };
}

module.exports = { classifyWebsite };
