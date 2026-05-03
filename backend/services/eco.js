/**
 * Estimates carbon footprint based on page weight
 * @param {number} contentSizeBytes 
 * @returns {{ co2Grams: number, rating: string, description: string }}
 */
function calculateCarbonFootprint(contentSizeBytes) {
  // Using an approximation: 1 GB of data transfer = ~0.2 kg CO2e
  // So 1 MB = ~0.2 grams CO2e (this is a rough heuristic, the Sustainable Web Manifesto uses similar averages)
  const megabytes = contentSizeBytes / (1024 * 1024);
  const co2Grams = megabytes * 0.2;
  
  let rating = 'GREEN';
  let description = 'Highly optimized and eco-friendly.';

  if (co2Grams > 1.0) {
    rating = 'POOR';
    description = 'Very heavy page, generating high emissions per visit.';
  } else if (co2Grams > 0.4) {
    rating = 'MODERATE';
    description = 'Average footprint. Could be optimized.';
  }

  return {
    co2Grams: Number(co2Grams.toFixed(3)),
    rating,
    description
  };
}

module.exports = { calculateCarbonFootprint };
