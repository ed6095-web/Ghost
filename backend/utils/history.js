/**
 * In-memory history store for analyzed URLs.
 * Keeps the last MAX_HISTORY entries.
 */

const MAX_HISTORY = 50;
let history = [];

function addToHistory(entry) {
  // Avoid duplicates — update existing entry if same URL
  history = history.filter(h => h.url !== entry.url);
  history.unshift(entry);
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
}

function getHistory(limit = 20) {
  return history.slice(0, limit);
}

function clearHistory() {
  history = [];
}

module.exports = { addToHistory, getHistory, clearHistory };
