/**
 * Ghost Master Scorer
 * Weights: Performance (30%), Security (30%), Privacy (20%), Structure (20%)
 */

function calculateMasterScore(data) {
  let scores = {
    performance: 0,
    security: 0,
    privacy: 0,
    structure: 0
  };

  // 1. Performance (0-100)
  // Base on response time and size
  let perf = 100;
  if (data.performance.responseTime > 2000) perf -= 40;
  else if (data.performance.responseTime > 1000) perf -= 20;
  
  if (data.performance.contentSize > 5 * 1024 * 1024) perf -= 30; // > 5MB
  else if (data.performance.contentSize > 2 * 1024 * 1024) perf -= 15;
  scores.performance = Math.max(0, perf);

  // 2. Security (0-100)
  // Use the existing security score percent
  scores.security = data.security.scorePercent || 0;

  // 3. Privacy (0-100)
  // Base on tracker count
  let priv = 100;
  const trackerCount = data.trackers ? data.trackers.length : 0;
  if (trackerCount > 15) priv = 20;
  else if (trackerCount > 8) priv = 50;
  else if (trackerCount > 3) priv = 80;
  scores.privacy = priv;

  // 4. Structure (0-100)
  // Base on metadata completeness
  let struct = 0;
  const p = data.preview;
  if (p.title) struct += 30;
  if (p.description) struct += 30;
  if (p.favicon) struct += 20;
  if (p.image) struct += 20;
  scores.structure = struct;

  // Weighted Total
  const total = (
    (scores.performance * 0.3) +
    (scores.security * 0.3) +
    (scores.privacy * 0.2) +
    (scores.structure * 0.2)
  );

  let label = 'Average';
  if (total >= 80) label = 'Excellent';
  else if (total >= 60) label = 'Good';
  else if (total < 40) label = 'Risky';

  return {
    total: Math.round(total),
    label,
    breakdown: scores
  };
}

module.exports = { calculateMasterScore };
