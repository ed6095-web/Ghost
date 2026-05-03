/**
 * Ghost AI Audit Engine
 * In a real production app, this would call Gemini or GPT-4.
 * For this version, we implement a robust rule-based "AI-simulated" auditor 
 * that generates deep human-like insights.
 */

function generateAudit(data) {
  const insights = [];
  
  // 1. Performance Insights
  if (data.performance.responseTime > 1500) {
    insights.push("Performance is critically slow. This is likely due to server-side latency or unoptimized assets, which will lead to high bounce rates.");
  } else if (data.performance.responseTime < 500) {
    insights.push("Excellent server response time. The site is highly optimized for instant interaction.");
  }

  // 2. Security Insights
  if (!data.security.isHttps) {
    insights.push("MAJOR RISK: Site lacks HTTPS. All data transmitted is visible to attackers. This is a non-starter for any modern web project.");
  } else if (data.security.scorePercent < 50) {
    insights.push("Security headers are dangerously sparse. While it has HTTPS, it lacks CSP and X-Frame-Options, leaving it vulnerable to XSS and Clickjacking.");
  }

  // 3. Tracking & Privacy
  const trackers = data.trackers ? data.trackers.length : 0;
  if (trackers > 10) {
    insights.push(`High privacy risk detected with ${trackers} third-party trackers. This site heavily monitors user behavior, which might impact GDPR compliance.`);
  }

  // 4. Content & SEO
  if (!data.preview.description) {
    insights.push("Missing meta-description. This will negatively impact SEO and how the site appears in search engine result pages.");
  }

  // Summary logic
  let summary = "";
  if (data.masterScore.total > 80) {
    summary = "This is a world-class website. It follows best practices for performance, security, and user privacy.";
  } else if (data.masterScore.total > 50) {
    summary = "The website is functional but has several engineering gaps that need to be addressed, particularly around security hardening.";
  } else {
    summary = "This website is in a risky state. Immediate action is required to fix protocol and security vulnerabilities.";
  }

  return {
    summary,
    insights: insights.length > 0 ? insights : ["No major anomalies detected. The site follows standard web protocols."]
  };
}

module.exports = { generateAudit };
