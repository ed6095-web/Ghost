const API_BASE = '/api';

// DOM refs
const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const inputWrapper = document.getElementById('inputWrapper');
const inputError = document.getElementById('inputError');
const heroSection = document.getElementById('heroSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const loadingUrl = document.getElementById('loadingUrl');
const loadingBar = document.getElementById('loadingBar');
const historyPanel = document.getElementById('historyPanel');
const historyOverlay = document.getElementById('historyOverlay');
const historyList = document.getElementById('historyList');
const toastContainer = document.getElementById('toastContainer');

let currentData = null;

// ── Theme Toggle ──────────────────────────────────────────────
const themeBtn = document.getElementById('themeToggleBtn');
themeBtn.addEventListener('click', () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('ghost-theme', html.dataset.theme);
});
const savedTheme = localStorage.getItem('ghost-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

// ── History Panel ─────────────────────────────────────────────
document.getElementById('historyToggleBtn').addEventListener('click', openHistory);
document.getElementById('closeHistoryBtn').addEventListener('click', closeHistory);
historyOverlay.addEventListener('click', closeHistory);
document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  await fetch(`${API_BASE}/history`, { method: 'DELETE' }).catch(() => {});
  historyList.innerHTML = '<p class="history-empty">History cleared.</p>';
  showToast('History cleared', 'success');
});

function openHistory() {
  historyPanel.classList.add('open');
  historyPanel.setAttribute('aria-hidden', 'false');
  historyOverlay.classList.add('visible');
  loadHistoryPanel();
}
function closeHistory() {
  historyPanel.classList.remove('open');
  historyPanel.setAttribute('aria-hidden', 'true');
  historyOverlay.classList.remove('visible');
}
async function loadHistoryPanel() {
  try {
    const res = await fetch(`${API_BASE}/history`);
    const json = await res.json();
    const items = json.data || [];
    if (!items.length) {
      historyList.innerHTML = '<p class="history-empty">No analyses yet.</p>';
      return;
    }
    historyList.innerHTML = items.map(item => `
      <div class="history-item" data-url="${escHtml(item.url)}">
        <div class="history-favicon-fallback">${item.category?.icon || '🌐'}</div>
        <div class="history-info">
          <div class="history-title">${escHtml(item.title || item.url)}</div>
          <div class="history-url">${escHtml(item.url)}</div>
          <div class="history-meta">${formatDate(item.analyzedAt)}</div>
        </div>
        <div class="history-risk">
          <div class="risk-dot ${item.security || 'MEDIUM'}"></div>
        </div>
      </div>`).join('');
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        closeHistory();
        urlInput.value = el.dataset.url;
        runAnalysis(el.dataset.url);
      });
    });
  } catch {
    historyList.innerHTML = '<p class="history-empty">Failed to load history.</p>';
  }
}

// ── Quick chips ───────────────────────────────────────────────
document.querySelectorAll('.quick-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    urlInput.value = btn.dataset.url;
    runAnalysis(btn.dataset.url);
  });
});

// ── Logo home ─────────────────────────────────────────────────
document.getElementById('logoHome').addEventListener('click', e => {
  e.preventDefault();
  showHero();
});

// ── Analyze New ───────────────────────────────────────────────
document.getElementById('analyzeNewBtn').addEventListener('click', showHero);
document.getElementById('errorRetryBtn').addEventListener('click', showHero);

// ── Copy Link ─────────────────────────────────────────────────
document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const url = currentData?.url || '';
  navigator.clipboard.writeText(url).then(() => showToast('URL copied!', 'success')).catch(() => {});
});

// ── PDF Export ────────────────────────────────────────────────
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  window.print();
});

// ── Form Submit ───────────────────────────────────────────────
urlForm.addEventListener('submit', e => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) { setInputError('Please enter a URL.'); return; }
  runAnalysis(url);
});

// ── Core Analysis ─────────────────────────────────────────────
async function runAnalysis(rawUrl) {
  clearInputError();
  showLoading(rawUrl);

  const steps = ['step-fetch', 'step-meta', 'step-security', 'step-classify', 'step-screenshot'];
  let stepIdx = 0;
  const stepInterval = setInterval(() => {
    if (stepIdx > 0) markStepDone(steps[stepIdx - 1]);
    if (stepIdx < steps.length) {
      activateStep(steps[stepIdx]);
      setLoadingProgress((stepIdx + 1) / steps.length * 85);
      stepIdx++;
    }
  }, 900);

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl }),
    });
    const json = await res.json();
    clearInterval(stepInterval);

    if (!res.ok || !json.success) {
      showError(json.error || 'Analysis failed. Please try again.');
      return;
    }

    // Finish loading animation
    steps.forEach(s => markStepDone(s));
    setLoadingProgress(100);
    await delay(500);

    currentData = json.data;
    renderResults(json.data);

  } catch (err) {
    clearInterval(stepInterval);
    showError('Could not connect to Ghost server. Make sure the backend is running.');
  }
}

// ── Render Results ────────────────────────────────────────────
function renderResults(data) {
  // URL info header
  const domain = tryGetDomain(data.url);
  document.getElementById('resultsUrlInfo').innerHTML =
    `Analyzed <strong>${escHtml(domain)}</strong> &mdash; ${formatDate(data.analyzedAt)} &mdash; ${data.totalTime}ms total`;

  renderPreview(data.preview, data.url);
  renderScreenshot(data.screenshot);
  renderPerformance(data.performance);
  renderSecurity(data.security);
  renderCategory(data.category);
  renderMetadata(data.preview, data.url);

  // New interactive features
  renderEco(data.eco);
  renderTrackers(data.trackers, data.url);
  renderBrand(data.brand);
  initSecurityGame(data.security);
  initAudioSonification(data);

  showResults();
}

function renderPreview(preview, url) {
  const domain = tryGetDomain(url);
  const img = preview.image
    ? `<img class="lp-image" src="${escHtml(preview.image)}" alt="Preview" loading="lazy" onerror="this.parentNode.innerHTML='<div class=lp-image-placeholder>🌐</div>'">`
    : `<div class="lp-image-placeholder">🌐</div>`;
  const favicon = preview.favicon
    ? `<img class="lp-favicon" src="${escHtml(preview.favicon)}" alt="" onerror="this.style.display='none'">` : '';

  document.getElementById('linkPreview').innerHTML = `
    ${img}
    <div class="lp-body">
      <div class="lp-site">${favicon}<span>${escHtml(preview.siteName || domain)}</span></div>
      <div class="lp-title">${escHtml(preview.title || 'No title found')}</div>
      ${preview.description ? `<div class="lp-desc">${escHtml(preview.description)}</div>` : ''}
      <div class="lp-url">${escHtml(url)}</div>
    </div>`;
}

function renderScreenshot(shot) {
  const el = document.getElementById('screenshotContainer');
  const badge = document.getElementById('screenshotBadge');
  if (shot) {
    el.innerHTML = `<img class="screenshot-img" src="${shot}" alt="Website screenshot" loading="lazy">`;
    badge.textContent = 'LIVE';
    badge.style.background = 'var(--green)';
  } else {
    el.innerHTML = `<div class="screenshot-unavailable"><div class="icon">🖥️</div>Screenshot unavailable<br><small>Puppeteer may not be installed or the page blocked headless browsers.</small></div>`;
    badge.textContent = 'N/A';
    badge.style.background = 'var(--text2)';
  }
}

function renderPerformance(perf) {
  const badge = document.getElementById('perfRatingBadge');
  badge.textContent = perf.rating;
  badge.className = `card-badge perf-badge ${perf.rating}`;

  const maxTime = 5000;
  const timeBar = Math.min((perf.responseTime / maxTime) * 100, 100);
  const timeColor = perf.responseTime < 800 ? 'bar-green' : perf.responseTime < 2000 ? 'bar-yellow' : 'bar-red';

  const maxSize = 5_000_000;
  const sizeBar = Math.min((perf.contentSize / maxSize) * 100, 100);
  const sizeColor = perf.contentSize < 500_000 ? 'bar-green' : perf.contentSize < 2_000_000 ? 'bar-yellow' : 'bar-red';

  document.getElementById('perfCardBody').innerHTML = `
    <div class="metric-row">
      <div class="metric-label">Response Time</div>
      <div class="metric-bar-wrap"><div class="metric-bar ${timeColor}" id="bar-time"></div></div>
      <div class="metric-value">${perf.responseTime}ms</div>
    </div>
    <div class="metric-row">
      <div class="metric-label">Content Size</div>
      <div class="metric-bar-wrap"><div class="metric-bar ${sizeColor}" id="bar-size"></div></div>
      <div class="metric-value">${formatBytes(perf.contentSize)}</div>
    </div>
    <div class="metric-row">
      <div class="metric-label">HTTP Status</div>
      <div class="metric-bar-wrap"><div class="metric-bar bar-green" id="bar-status"></div></div>
      <div class="metric-value">${perf.statusCode}</div>
    </div>`;
  // Animate bars after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const barTime = document.getElementById('bar-time');
      const barSize = document.getElementById('bar-size');
      const barStatus = document.getElementById('bar-status');
      if (barTime) barTime.style.width = timeBar + '%';
      if (barSize) barSize.style.width = sizeBar + '%';
      if (barStatus) barStatus.style.width = '100%';
    });
  });
}

function renderSecurity(sec) {
  const badge = document.getElementById('securityRiskBadge');
  const riskLabels = { LOW: 'Low Risk', MEDIUM: 'Medium Risk', HIGH: 'High Risk', CRITICAL: 'Critical', UNKNOWN: 'Unknown' };
  badge.textContent = riskLabels[sec.risk] || sec.risk;
  badge.className = `card-badge security-badge ${sec.risk}`;

  const scoreColor = sec.scorePercent >= 75 ? '#10b981' : sec.scorePercent >= 40 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (sec.scorePercent / 100) * circumference;

  const checksHtml = (sec.checks || []).map(c => `
    <div class="header-check ${c.present ? 'pass' : 'fail'}">
      <div class="check-icon ${c.present ? 'pass' : 'fail'}">${c.present ? '✓' : '✗'}</div>
      <div>
        <div class="check-label">${escHtml(c.header)}</div>
        <div class="check-desc">${escHtml(c.description)}</div>
      </div>
    </div>`).join('');

  const passedCount = sec.passedCount ?? (sec.checks || []).filter(c => c.present).length;
  const totalCount  = sec.totalCount  ?? (sec.checks || []).length;

  document.getElementById('securityCardBody').innerHTML = `
    <div class="security-score-ring">
      <div class="ring-wrap">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="8"/>
          <circle cx="40" cy="40" r="30" fill="none" stroke="${scoreColor}" stroke-width="8"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            stroke-linecap="round" transform="rotate(-90 40 40)" id="securityRing"/>
        </svg>
        <div class="ring-label">
          <span class="ring-pct" style="color:${scoreColor}">${sec.scorePercent ?? 0}%</span>
          <span class="ring-text">Score</span>
        </div>
      </div>
      <div class="ring-info">
        <h3>${sec.isHttps ? '🔒 HTTPS' : '⚠️ HTTP'}</h3>
        <p>${passedCount} of ${totalCount} security headers present.<br>Protocol: ${sec.protocol}</p>
      </div>
    </div>
    <div class="header-checks">${checksHtml}</div>`;
  // Animate ring after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const ring = document.getElementById('securityRing');
      if (ring) ring.style.cssText += `stroke-dashoffset:${offset};transition:stroke-dashoffset 1s ease`;
    });
  });
}

function renderCategory(cat) {
  document.getElementById('categoryCardBody').innerHTML = `
    <div class="category-display">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name" style="color:${cat.color}">${escHtml(cat.name)}</div>
      <div class="category-conf">Confidence: ${cat.confidence}</div>
    </div>`;
  document.getElementById('categoryExtraBody').innerHTML = `
    <div class="category-display" style="align-items:flex-start;text-align:left;gap:.6rem">
      <div style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text2)">Detected As</div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <span style="font-size:2rem">${cat.icon}</span>
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:${cat.color}">${escHtml(cat.name)}</div>
          <div style="font-size:.8rem;color:var(--text2);margin-top:.2rem">Based on domain & keyword analysis</div>
        </div>
      </div>
      <div style="width:100%;margin-top:.5rem">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text2);margin-bottom:.3rem">
          <span>Match confidence</span><span style="color:var(--text);font-weight:600">${cat.confidence}</span>
        </div>
        <div style="background:var(--bg);border-radius:100px;height:6px;overflow:hidden">
          <div style="height:100%;border-radius:100px;background:${cat.color};width:${cat.confidence==='high'?'90':cat.confidence==='medium'?'55':'25'}%;transition:width 1s ease"></div>
        </div>
      </div>
    </div>`;
}

function renderMetadata(preview, url) {
  const rows = [
    ['Title', preview.title, false],
    ['Description', preview.description, false],
    ['OG Title', preview.ogTitle, false],
    ['Site Name', preview.siteName, false],
    ['Language', preview.language, false],
    ['Author', preview.author, false],
    ['Keywords', preview.keywords, false],
    ['Canonical', preview.canonical, true],
    ['Theme Color', preview.themeColor, false],
    ['Favicon', preview.favicon, true],
  ].filter(r => r[1]);

  document.getElementById('metaCardBody').innerHTML = rows.length
    ? `<div class="meta-list">${rows.map(([k, v, mono]) =>
        `<div class="meta-item">
          <div class="meta-key">${k}</div>
          <div class="meta-val ${mono ? 'mono' : ''}">${escHtml(String(v))}</div>
        </div>`).join('')}</div>`
    : '<p style="color:var(--text2);font-size:.85rem">No additional metadata found.</p>';
}

// ── State helpers ─────────────────────────────────────────────
function showHero() {
  heroSection.style.display = 'flex';
  heroSection.setAttribute('aria-hidden', 'false');
  loadingSection.classList.remove('visible');
  loadingSection.setAttribute('aria-hidden', 'true');
  resultsSection.classList.remove('visible');
  resultsSection.setAttribute('aria-hidden', 'true');
  errorSection.classList.remove('visible');
  errorSection.setAttribute('aria-hidden', 'true');
  urlInput.value = '';
  urlInput.focus();
  resetLoadingSteps();
}

function showLoading(url) {
  heroSection.style.display = 'none';
  loadingSection.classList.add('visible');
  loadingSection.setAttribute('aria-hidden', 'false');
  resultsSection.classList.remove('visible');
  errorSection.classList.remove('visible');
  loadingUrl.textContent = tryGetDomain(url);
  setLoadingProgress(0);
  resetLoadingSteps();
  analyzeBtn.disabled = true;
}

function showResults() {
  loadingSection.classList.remove('visible');
  loadingSection.setAttribute('aria-hidden', 'true');
  resultsSection.classList.add('visible');
  resultsSection.setAttribute('aria-hidden', 'false');
  analyzeBtn.disabled = false;
  // Animate cards
  document.querySelectorAll('.result-card').forEach((c, i) => {
    c.style.animationDelay = `${i * 0.07}s`;
  });
}

function showError(msg) {
  loadingSection.classList.remove('visible');
  errorSection.classList.add('visible');
  errorSection.setAttribute('aria-hidden', 'false');
  document.getElementById('errorMessage').textContent = msg;
  analyzeBtn.disabled = false;
}

function setInputError(msg) {
  inputError.textContent = msg;
  inputWrapper.classList.add('error');
}
function clearInputError() {
  inputError.textContent = '';
  inputWrapper.classList.remove('error');
}

function resetLoadingSteps() {
  document.querySelectorAll('.loading-step').forEach((s, i) => {
    s.className = 'loading-step' + (i === 0 ? ' active' : '');
  });
  setLoadingProgress(0);
}
function activateStep(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'loading-step active';
}
function markStepDone(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'loading-step done';
}
function setLoadingProgress(pct) {
  loadingBar.style.width = pct + '%';
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 350); }, 2500);
}

// ── Utils ─────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function tryGetDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
function formatDate(iso) {
  if (!iso) return '';
  try { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return iso; }
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Init ──────────────────────────────────────────────────────
showHero();
urlInput.focus();

// ── Interactive Features ──────────────────────────────────────

// 1. Eco Visualizer
function renderEco(eco) {
  if (!eco) return;
  const badge = document.getElementById('ecoBadge');
  badge.textContent = eco.rating;
  badge.className = `card-badge eco-badge ${eco.rating}`;
  badge.style.background = eco.rating === 'GREEN' ? 'var(--green)' : eco.rating === 'MODERATE' ? 'var(--yellow)' : 'var(--red)';

  document.getElementById('ecoStats').innerHTML = `
    <strong>${eco.co2Grams}g CO2</strong> per visit<br>
    ${escHtml(eco.description)}
  `;

  const vis = document.getElementById('ecoVisualizer');
  vis.innerHTML = ''; // clear

  const particleCount = eco.rating === 'GREEN' ? 15 : eco.rating === 'MODERATE' ? 30 : 50;
  const isGreen = eco.rating === 'GREEN';

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 15 + 5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = (Math.random() * 100) + '%';
    
    if (isGreen) {
      p.style.background = '#10b981'; // green leaf
      p.style.borderRadius = '0 50% 0 50%';
      p.style.animation = `floatLeaf ${Math.random() * 3 + 2}s linear infinite`;
    } else {
      p.style.background = eco.rating === 'POOR' ? '#4b5563' : '#9ca3af'; // gray smog
      p.style.animation = `floatSmog ${Math.random() * 4 + 2}s ease-out infinite`;
    }
    p.style.animationDelay = (Math.random() * 5) + 's';
    vis.appendChild(p);
  }
}

// 2. Tracker Constellation (Canvas)
function renderTrackers(trackers, url) {
  const canvas = document.getElementById('trackersCanvas');
  const ctx = canvas.getContext('2d');
  const info = document.getElementById('trackersInfo');
  
  const nodes = [];
  // Center node (website)
  nodes.push({ id: 'main', label: tryGetDomain(url), x: canvas.width/2, y: canvas.height/2, radius: 25, color: '#3b82f6', category: 'Host' });
  
  if (!trackers || trackers.length === 0) {
    info.textContent = 'Tracker-Free Zone! 🛡️';
    // Add some "clean" particles
    for(let i=0; i<3; i++) {
      nodes.push({
        id: 'ghost', label: 'Anonymous Visitor', x: canvas.width/2 + (Math.random()*60 - 30), y: canvas.height/2 + (Math.random()*60 - 30),
        radius: 8, color: '#10b981', category: 'Clean Traffic', vx:0, vy:0
      });
    }
  } else {
    // Tracker nodes
    trackers.forEach((t, i) => {
      const angle = (i / trackers.length) * Math.PI * 2;
      const distance = 80 + Math.random() * 40;
      nodes.push({
        id: t.name,
        label: t.name,
        x: canvas.width/2 + Math.cos(angle) * distance,
        y: canvas.height/2 + Math.sin(angle) * distance,
        radius: 15,
        color: '#ef4444',
        category: t.category,
        vx: 0, vy: 0
      });
    });
  }

  let animationId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw lines
    nodes.forEach(n => {
      if (n.id === 'main') return;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = n.id === 'ghost' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Apply slight floating physics
    nodes.forEach(n => {
      if (n.id === 'main') return;
      n.x += Math.sin(Date.now() / 1000 + n.radius) * (n.id === 'ghost' ? 0.4 : 0.2);
      n.y += Math.cos(Date.now() / 1000 + n.radius) * (n.id === 'ghost' ? 0.4 : 0.2);
    });

    animationId = requestAnimationFrame(draw);
  }
  
  draw();

  // Mouse hover logic
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let hovered = null;
    nodes.forEach(n => {
      const dist = Math.sqrt((x - n.x)**2 + (y - n.y)**2);
      if (dist < n.radius) hovered = n;
    });

    if (hovered) {
      info.textContent = hovered.id === 'main' ? hovered.label : `${hovered.label} (${hovered.category})`;
      canvas.style.cursor = 'pointer';
    } else {
      info.textContent = trackers && trackers.length > 0 ? `${trackers.length} Trackers Found` : 'Tracker-Free Zone! 🛡️';
      canvas.style.cursor = 'default';
    }
  };
}

// 3. Brand Hacker
function renderBrand(brand) {
  if (!brand) return;
  
  let colorsHtml = brand.colors.map(hex => `
    <div class="color-swatch-wrap" onclick="navigator.clipboard.writeText('${hex}'); showToast('Copied ${hex}')">
      <div class="color-swatch" style="background:${hex}"></div>
      <div class="color-hex">${hex}</div>
    </div>
  `).join('');

  if (!colorsHtml) colorsHtml = '<p>No colors found</p>';

  const primaryFont = brand.fonts.length > 0 ? brand.fonts[0] : 'sans-serif';

  document.getElementById('brandCardBody').innerHTML = `
    <div class="brand-colors">${colorsHtml}</div>
    <div class="font-tester">
      <div class="font-name">Font: ${escHtml(primaryFont)}</div>
      <input type="text" class="font-input" value="Ghost Analyzer" style="font-family: ${escHtml(primaryFont)}; color: ${brand.colors[0] || '#fff'}" />
      <p style="font-size:0.7rem; color:var(--text3)">Type to test typography. Click colors to copy HEX.</p>
    </div>
  `;
}

// 4. Security Game
function initSecurityGame(sec) {
  const wrapper = document.getElementById('securityGameWrapper');
  const swipeCard = document.getElementById('securitySwipeCard');
  const resultCard = document.getElementById('securityCard');
  const cluesEl = document.getElementById('swipeClues');
  
  // Reset UI
  swipeCard.style.display = 'flex';
  swipeCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
  swipeCard.style.opacity = '1';
  resultCard.classList.add('hidden-behind');

  // Generate Clues
  let clues = [];
  if (!sec.isHttps) clues.push('⚠️ Uses insecure HTTP connection');
  if (sec.scorePercent < 50) clues.push('⚠️ Missing major security headers');
  if (sec.isHttps && sec.scorePercent >= 80) clues.push('✅ Strict security policies detected');
  if (clues.length === 0) clues.push('ℹ️ Standard server headers present');

  cluesEl.innerHTML = clues.map(c => `<div>${c}</div>`).join('');

  const handleGuess = (guessedSafe) => {
    const isActuallySafe = sec.risk === 'LOW' || sec.risk === 'MEDIUM';
    if (guessedSafe === isActuallySafe) {
      showToast('Correct! You have a good eye.', 'success');
    } else {
      showToast('Wrong! Don\'t get phished.', 'error');
    }

    // Animate out
    swipeCard.style.transform = guessedSafe ? 'translate(200px, -50px) rotate(15deg)' : 'translate(-200px, -50px) rotate(-15deg)';
    swipeCard.style.opacity = '0';
    setTimeout(() => {
      swipeCard.style.display = 'none';
      resultCard.classList.remove('hidden-behind');
    }, 300);
  };

  document.getElementById('swipeYesBtn').onclick = () => handleGuess(true);
  document.getElementById('swipeNoBtn').onclick = () => handleGuess(false);
}

// 5. Audio Sonification
let audioCtx = null;
let isPlaying = false;
let oscs = [];

function initAudioSonification(data) {
  const playBtn = document.getElementById('audioPlayBtn');
  const audioBody = document.querySelector('.audio-body');
  
  // Reset state
  if (isPlaying) stopAudio();
  audioBody.classList.remove('playing');
  playBtn.innerHTML = '<span class="icon">▶️</span> Listen to the Code';

  playBtn.onclick = () => {
    if (isPlaying) {
      stopAudio();
      audioBody.classList.remove('playing');
      playBtn.innerHTML = '<span class="icon">▶️</span> Listen to the Code';
    } else {
      playAudio(data);
      audioBody.classList.add('playing');
      playBtn.innerHTML = '<span class="icon">⏹️</span> Stop Audio';
    }
  };
}

function playAudio(data) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  isPlaying = true;

  const perf = data.performance;
  const sec = data.security;

  // Base frequency depends on response time (fast = high pitch, slow = low pitch)
  const baseFreq = perf.responseTime < 500 ? 440 : perf.responseTime < 1500 ? 220 : 110;
  
  // Security determines the chord (good = major, bad = minor/dissonant)
  const intervals = (sec.risk === 'LOW' || sec.risk === 'MEDIUM') 
    ? [1, 1.25, 1.5] // Major triad
    : [1, 1.18, 1.4]; // Minor/dissonant

  intervals.forEach(interval => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = sec.risk === 'LOW' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * interval, audioCtx.currentTime);
    
    // LFO based on content size (heavier = more wobble)
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    const speed = Math.min((perf.contentSize / 1000000), 10);
    lfo.frequency.value = speed > 0 ? speed : 1;
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 50; // Pitch modulation depth
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    gain.gain.value = 0.1; // Low volume
    
    osc.start();
    lfo.start();
    oscs.push({osc, gain, lfo});
  });
}

function stopAudio() {
  isPlaying = false;
  oscs.forEach(({osc, gain, lfo}) => {
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    setTimeout(() => {
      osc.stop();
      lfo.stop();
    }, 100);
  });
  oscs = [];
}

