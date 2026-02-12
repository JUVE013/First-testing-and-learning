// ==============================
// FTSE 100 Tracker (GitHub Pages)
// ==============================

const DATA_URL = './data/ftse100.json';

const BGEO_CANDIDATE = {
  name: 'Bank of Georgia Group',
  ticker: 'BGEO.L',
};

// ---------- Helpers ----------

function normalizeTicker(t) {
  return (t || '').trim().toUpperCase();
}

function fmtNumber(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function setStatus(text) {
  const el =
    document.getElementById('status') ||
    document.querySelector('.status') ||
    document.querySelector('[data-status]');
  if (el) el.textContent = text;
}

function setCardValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------- Data Loading ----------

async function loadSnapshot() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
  }
  return res.json();
}

// ---------- Data Processing ----------

function injectBGEO(companies) {
  const tickers = new Set(companies.map(c => normalizeTicker(c.ticker)));

  if (!tickers.has(normalizeTicker(BGEO_CANDIDATE.ticker))) {
    companies.push({
      name: BGEO_CANDIDATE.name,
      ticker: BGEO_CANDIDATE.ticker,
      price: null,
      marketCap: null,
      updatedAt: new Date().toISOString(),
      addedCandidate: true,
    });
  }

  return companies;
}

function sortByMarketCap(companies) {
  return [...companies].sort((a, b) => {
    const am = Number.isFinite(a.marketCap) ? a.marketCap : -Infinity;
    const bm = Number.isFinite(b.marketCap) ? b.marketCap : -Infinity;
    return bm - am;
  });
}

function computeBGEO(sorted) {
  const index = sorted.findIndex(
    c => normalizeTicker(c.ticker) === normalizeTicker(BGEO_CANDIDATE.ticker)
  );

  if (index === -1) return null;

  return {
    rank: index + 1,
    marketCap: sorted[index].marketCap,
  };
}

// ---------- Rendering ----------

function ensureTable() {
  let table = document.querySelector('table');

  if (!table) {
    table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="text-align:left;padding:8px;">Rank</th>
        <th style="text-align:left;padding:8px;">Company</th>
        <th style="text-align:left;padding:8px;">Ticker</th>
        <th style="text-align:right;padding:8px;">Price</th>
        <th style="text-align:right;padding:8px;">Market Cap</th>
        <th style="text-align:left;padding:8px;">Notes</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    document.body.appendChild(table);
  }

  return table.querySelector('tbody');
}

function renderTable(companies) {
  const tbody = ensureTable();
  tbody.innerHTML = '';

companies.forEach((c, index) => {
  const tr = document.createElement('tr');

  const isBGEO =
    normalizeTicker(c.ticker) === normalizeTicker(BGEO_CANDIDATE.ticker);

  if (isBGEO) {
    tr.classList.add('bgeo-row');
  }

    const rank = index + 1;
    const notes = c.addedCandidate ? 'Added candidate' : '';

    tr.innerHTML = `
      <td style="padding:6px;">${rank}</td>
      <td style="padding:6px;">${c.name || '—'}</td>
      <td style="padding:6px;">${c.ticker || '—'}</td>
      <td style="padding:6px;text-align:right;">${fmtNumber(c.price)}</td>
      <td style="padding:6px;text-align:right;">${fmtMoney(c.marketCap)}</td>
      <td style="padding:6px;">${notes}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ---------- Main ----------

async function main() {
  try {
    setStatus('Loading FTSE snapshot...');

    const snapshot = await loadSnapshot();

    let companies = Array.isArray(snapshot.companies)
      ? snapshot.companies
      : [];

    companies = injectBGEO(companies);

    const sorted = sortByMarketCap(companies);

    renderTable(sorted);

    setCardValue('totalCompanies', sorted.length);

    const bgeo = computeBGEO(sorted);
    if (bgeo) {
      setCardValue('bgeoRank', bgeo.rank);
      setCardValue('bgeoMarketCap', fmtMoney(bgeo.marketCap));
    }

    setStatus(
      snapshot.updatedAt
        ? `Updated: ${snapshot.updatedAt}`
        : 'Data loaded successfully'
    );

  } catch (err) {
    console.error(err);
    setStatus(`Error loading data: ${err.message}`);
  }
}

main();
