/* =========================================================
   SENTRYPOINT — shared client logic
   -----------------------------------------------------------
   SECURITY NOTES (read before wiring up real APIs):
   1. Never call VirusTotal / HIBP / WHOIS APIs directly from
      this client-side file with a real API key. Any key placed
      here is visible to every visitor via "view source" and
      will be stolen and abused within hours.
      -> Put real API calls in a small backend (Node/Express,
         Cloudflare Worker, Vercel/Netlify function, etc.) and
         have this file call YOUR backend endpoint instead.
         The placeholder functions below show exactly where
         that swap happens (search "BACKEND CALL GOES HERE").
   2. All user-supplied text is rendered with textContent, not
      innerHTML, to avoid stored/reflected XSS from scan targets
      or API responses.
   3. Inputs are validated client-side for UX only — always
      re-validate server-side too.
   4. Free-tier quota below is a client-side demo only. A real
      quota/rate-limit must be enforced server-side (per-account
      and per-IP) or it can be bypassed by clearing localStorage.
   ========================================================= */

// ---- Nav toggle (mobile) ----
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
});

// ---- Hero console type-on effect ----
function typeConsole(el, lines, speed = 18) {
  if (!el) return;
  el.textContent = '';
  let li = 0, ci = 0;

  function step() {
    if (li >= lines.length) return;
    const { text, cls } = lines[li];
    if (ci === 0) {
      const span = document.createElement('span');
      if (cls) span.className = cls;
      span.dataset.building = 'true';
      el.appendChild(span);
    }
    const currentSpan = el.querySelector('[data-building="true"]');
    currentSpan.textContent = text.slice(0, ci + 1);
    ci++;
    if (ci >= text.length) {
      currentSpan.removeAttribute('data-building');
      el.appendChild(document.createElement('br'));
      li++; ci = 0;
      setTimeout(step, 220);
    } else {
      setTimeout(step, speed);
    }
  }
  step();
}

document.addEventListener('DOMContentLoaded', () => {
  const consoleBody = document.getElementById('heroConsole');
  if (consoleBody) {
    typeConsole(consoleBody, [
      { text: '$ sentrypoint scan --target 185.220.101.7', cls: 'prompt' },
      { text: '  resolving indicator type ... IP address' },
      { text: '  querying reputation feeds ... done (0.8s)' },
      { text: '  [VERDICT] MALICIOUS — flagged by 14/32 engines', cls: 'bad' },
      { text: '  known for: Tor exit node, C2 relay activity' },
      { text: '$ sentrypoint breach-check --email demo@example.com', cls: 'prompt' },
      { text: '  searching breach corpus ... done' },
      { text: '  [RESULT] found in 3 breaches — 2019, 2021, 2023', cls: 'warn' },
      { text: '  exposed data types: emails, hashed passwords, IPs' },
    ]);
  }
});

// =========================================================
// SCANNER PAGE LOGIC
// =========================================================
const FREE_SCAN_LIMIT = 5;

function getQuotaUsed() {
  return parseInt(localStorage.getItem('sp_scan_quota') || '0', 10);
}
function bumpQuota() {
  const n = getQuotaUsed() + 1;
  localStorage.setItem('sp_scan_quota', String(n));
  return n;
}

function initScanner() {
  const form = document.getElementById('scanForm');
  if (!form) return;

  const input = document.getElementById('scanInput');
  const resultPanel = document.getElementById('scanResults');
  const quotaLabel = document.getElementById('quotaLabel');
  const tabs = document.querySelectorAll('.tab[data-type]');
  let activeType = 'auto';

  function refreshQuotaLabel() {
    const used = getQuotaUsed();
    const remaining = Math.max(0, FREE_SCAN_LIMIT - used);
    quotaLabel.textContent = `${remaining} / ${FREE_SCAN_LIMIT} free scans remaining today`;
  }
  refreshQuotaLabel();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeType = tab.dataset.type;
      input.placeholder = placeholderFor(activeType);
    });
  });

  function placeholderFor(type) {
    switch (type) {
      case 'url': return 'https://example.com/suspicious-link';
      case 'ip': return '185.220.101.7';
      case 'domain': return 'example-domain.com';
      case 'hash': return 'file hash (SHA-256 / MD5)';
      default: return 'Paste a URL, IP, domain, or file hash…';
    }
  }

  function detectType(value) {
    if (/^https?:\/\//i.test(value)) return 'url';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return 'ip';
    if (/^[a-f0-9]{32}$|^[a-f0-9]{64}$/i.test(value)) return 'hash';
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) return 'domain';
    return 'unknown';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    const used = getQuotaUsed();
    if (used >= FREE_SCAN_LIMIT) {
      renderUpgradePrompt(resultPanel);
      return;
    }

    const type = activeType === 'auto' ? detectType(value) : activeType;
    renderLoading(resultPanel);

    try {
      const data = await runScan(value, type); // placeholder — see function below
      bumpQuota();
      refreshQuotaLabel();
      renderScanResult(resultPanel, data);
    } catch (err) {
      renderError(resultPanel, 'Scan failed. Please try again in a moment.');
    }
  });
}

// ---------------------------------------------------------
// PLACEHOLDER scan function.
// BACKEND CALL GOES HERE:
//   replace the mock block below with:
//     const res = await fetch('/api/scan', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ value, type })
//     });
//     return await res.json();
//   Your backend then calls the real VirusTotal API using a
//   server-side-only API key and returns a normalized result.
// ---------------------------------------------------------
async function runScan(value, type) {
  await new Promise(r => setTimeout(r, 900)); // simulate network latency

  // Deterministic-ish mock verdict so demos feel consistent
  const hash = [...value].reduce((a, c) => a + c.charCodeAt(0), 0);
  const verdicts = ['clean', 'suspicious', 'malicious'];
  const verdict = verdicts[hash % 3];

  return {
    target: value,
    type,
    verdict,
    engines: verdict === 'clean' ? '0/32' : verdict === 'suspicious' ? '4/32' : '17/32',
    firstSeen: '2024-03-11',
    lastSeen: '2026-08-02',
    registrar: type === 'domain' || type === 'url' ? 'NameCheap Inc.' : undefined,
    country: type === 'ip' ? 'Netherlands (AS204603)' : undefined,
    tags: verdict === 'malicious' ? ['c2', 'malware-hosting'] : verdict === 'suspicious' ? ['newly-registered'] : ['no-known-flags'],
  };
}

function renderLoading(panel) {
  panel.innerHTML = '';
  const p = document.createElement('div');
  p.className = 'result-empty';
  p.textContent = 'Scanning target…';
  panel.appendChild(p);
}

function renderError(panel, msg) {
  panel.innerHTML = '';
  const p = document.createElement('div');
  p.className = 'result-empty';
  p.style.color = 'var(--danger)';
  p.textContent = msg;
  panel.appendChild(p);
}

function badgeClassFor(verdict) {
  if (verdict === 'malicious') return 'badge badge-bad';
  if (verdict === 'suspicious') return 'badge badge-warn';
  return 'badge badge-clean';
}

function renderScanResult(panel, data) {
  panel.innerHTML = '';

  const rows = [
    ['Target', data.target],
    ['Type', data.type],
    ['Detections', data.engines],
    ['First seen', data.firstSeen],
    ['Last seen', data.lastSeen],
  ];
  if (data.registrar) rows.push(['Registrar', data.registrar]);
  if (data.country) rows.push(['Origin', data.country]);
  rows.push(['Tags', data.tags.join(', ')]);

  const verdictRow = document.createElement('div');
  verdictRow.className = 'result-row';
  const rk = document.createElement('div'); rk.className = 'rk'; rk.textContent = 'Verdict';
  const rv = document.createElement('div'); rv.className = 'rv';
  const badge = document.createElement('span');
  badge.className = badgeClassFor(data.verdict);
  badge.textContent = data.verdict.toUpperCase();
  rv.appendChild(badge);
  verdictRow.append(rk, rv);
  panel.appendChild(verdictRow);

  rows.forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    const rk2 = document.createElement('div'); rk2.className = 'rk'; rk2.textContent = k;
    const rv2 = document.createElement('div'); rv2.className = 'rv'; rv2.textContent = v; // textContent = XSS-safe
    row.append(rk2, rv2);
    panel.appendChild(row);
  });
}

function renderUpgradePrompt(panel) {
  panel.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'note-box';
  box.innerHTML = ''; // clear, then build safely
  const strong = document.createElement('strong');
  strong.textContent = "You've used today's free scans. ";
  const rest = document.createTextNode('Upgrade to Pro for unlimited scanning, deeper reputation history, and API access.');
  box.append(strong, rest);
  panel.appendChild(box);
}

document.addEventListener('DOMContentLoaded', initScanner);

// =========================================================
// BREACH CHECK PAGE LOGIC
// (Deliberately: shows WHICH breaches an email appeared in and
//  WHAT categories of data were exposed. It never shows, stores,
//  or looks up actual passwords for an account — that isn't a
//  security feature, it's a credential-theft feature, and this
//  product doesn't do it.)
// =========================================================
function initBreachCheck() {
  const form = document.getElementById('breachForm');
  if (!form) return;
  const input = document.getElementById('breachInput');
  const panel = document.getElementById('breachResults');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!isValidEmail(email)) {
      renderError(panel, 'Enter a valid email address.');
      return;
    }
    renderLoading(panel);
    try {
      const data = await runBreachCheck(email); // placeholder — see below
      renderBreachResult(panel, data);
    } catch {
      renderError(panel, 'Lookup failed. Please try again.');
    }
  });
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ---------------------------------------------------------
// PLACEHOLDER breach-check function.
// BACKEND CALL GOES HERE:
//   Have your backend query a legitimate breach-directory API
//   (e.g. Have I Been Pwned's API, which requires a paid key
//   and explicitly disallows exposing raw credentials) and
//   return only metadata: breach name, date, and the categories
//   of data exposed. Never surface actual passwords/hashes to
//   the client, logged-in or not — HIBP's own terms prohibit it.
// ---------------------------------------------------------
async function runBreachCheck(email) {
  await new Promise(r => setTimeout(r, 900));
  const hash = [...email].reduce((a, c) => a + c.charCodeAt(0), 0);
  const breachCount = hash % 4;

  const catalog = [
    { name: 'Collection Leak 2019', date: '2019-06-14', types: ['Emails', 'Usernames', 'Hashed passwords'] },
    { name: 'RetailCo Data Incident', date: '2021-11-02', types: ['Emails', 'Names', 'Purchase history'] },
    { name: 'SocialApp Breach', date: '2023-02-27', types: ['Emails', 'Phone numbers', 'Hashed passwords'] },
  ];

  return {
    email,
    breaches: catalog.slice(0, breachCount),
  };
}

function renderBreachResult(panel, data) {
  panel.innerHTML = '';

  if (data.breaches.length === 0) {
    const row = document.createElement('div');
    row.className = 'result-row';
    const rk = document.createElement('div'); rk.className = 'rk'; rk.textContent = 'Status';
    const rv = document.createElement('div'); rv.className = 'rv';
    const badge = document.createElement('span'); badge.className = 'badge badge-clean'; badge.textContent = 'NOT FOUND';
    rv.appendChild(badge);
    row.append(rk, rv);
    panel.appendChild(row);
    return;
  }

  const summary = document.createElement('div');
  summary.className = 'result-row';
  const rk = document.createElement('div'); rk.className = 'rk'; rk.textContent = 'Status';
  const rv = document.createElement('div'); rv.className = 'rv';
  const badge = document.createElement('span'); badge.className = 'badge badge-bad';
  badge.textContent = `FOUND IN ${data.breaches.length} BREACH${data.breaches.length > 1 ? 'ES' : ''}`;
  rv.appendChild(badge);
  summary.append(rk, rv);
  panel.appendChild(summary);

  data.breaches.forEach(b => {
    const row = document.createElement('div');
    row.className = 'result-row';
    const rk2 = document.createElement('div'); rk2.className = 'rk'; rk2.textContent = b.date;
    const rv2 = document.createElement('div'); rv2.className = 'rv'; rv2.textContent = `${b.name} — exposed: ${b.types.join(', ')}`;
    row.append(rk2, rv2);
    panel.appendChild(row);
  });

  const note = document.createElement('div');
  note.className = 'note-box';
  note.style.marginTop = '16px';
  const strong = document.createElement('strong');
  strong.textContent = 'Passwords are never displayed. ';
  note.appendChild(strong);
  note.appendChild(document.createTextNode('If you use any of the exposed accounts, change that password now and enable two-factor authentication — this tool tells you where you were exposed, not what your credentials were.'));
  panel.appendChild(note);
}

document.addEventListener('DOMContentLoaded', initBreachCheck);

// =========================================================
// PRICING TOGGLE
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  const monthlyEls = document.querySelectorAll('[data-billing="monthly"]');
  const yearlyEls = document.querySelectorAll('[data-billing="yearly"]');

  function apply(isYearly) {
    monthlyEls.forEach(el => el.style.display = isYearly ? 'none' : '');
    yearlyEls.forEach(el => el.style.display = isYearly ? '' : 'none');
    toggle.classList.toggle('on', isYearly);
  }
  apply(false);
  toggle.addEventListener('click', () => apply(!toggle.classList.contains('on')));
});
