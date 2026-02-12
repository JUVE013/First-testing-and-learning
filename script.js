const DATA_URL = 'data/ftse100.json';
const BGEO = { name: 'BGEO Group PLC', ticker: 'BGEO.L', isBGEO: true };

const statusEl = document.getElementById('status');
const tableBodyEl = document.getElementById('tableBody');
const totalCountEl = document.getElementById('totalCount');
const bgeoRankEl = document.getElementById('bgeoRank');
const bgeoCapEl = document.getElementById('bgeoCap');
const refreshBtn = document.getElementById('refreshBtn');

const priceFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat('en-GB', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

const FALLBACK_NAMES = [
  'AstraZeneca', 'Shell', 'HSBC Holdings', 'Unilever', 'BP', 'RELX', 'Diageo',
  'Rio Tinto', 'Glencore', 'Lloyds Banking Group', 'Barclays', 'NatWest Group',
  'Tesco', 'Vodafone Group', 'GSK', 'BAE Systems', 'Aviva', 'Prudential',
  'Legal & General', 'Persimmon',
];

function formatPrice(value) {
  return Number.isFinite(value) ? priceFormat.format(value) : 'N/A';
}

function formatCap(value) {
  return Number.isFinite(value)
    ? `${priceFormat.format(value)} (${compactFormat.format(value)})`
    : 'N/A';
}

function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toLseTicker(ticker) {
  if (!ticker) return null;
  return ticker.endsWith('.L') ? ticker : `${ticker}.L`;
}

function generateFallbackRows() {
  const updatedAt = new Date().toISOString();
  const seeded = FALLBACK_NAMES.map((name, idx) => {
    const ticker = `FALL${idx + 1}.L`;
    const seed = simpleHash(name);
    return {
      name,
      ticker,
      price: Number((100 + (seed % 2400) / 10).toFixed(2)),
      marketCap: 180_000_000_000 - idx * 7_200_000_000 - (seed % 450_000_000),
      updatedAt,
      isBGEO: false,
    };
  });

  const bgeoSeed = simpleHash(BGEO.ticker);
  seeded.push({
    ...BGEO,
    price: Number((90 + (bgeoSeed % 1200) / 10).toFixed(2)),
    marketCap: 5_000_000_000 + (bgeoSeed % 350_000_000),
    updatedAt,
  });

  return seeded;
}

async function loadJsonData() {
  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not fetch ${DATA_URL}: ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.companies) || payload.companies.length === 0) {
    throw new Error('JSON payload is missing companies[].');
  }

  return payload.companies.map((row) => ({
    name: row.name,
    ticker: toLseTicker(row.ticker),
    price: Number.isFinite(row.price) ? row.price : Number(row.price),
    marketCap: Number.isFinite(row.marketCap) ? row.marketCap : Number(row.marketCap),
    updatedAt: row.updatedAt || payload.updatedAt || null,
    isBGEO: false,
  }));
}

function rankRows(rows) {
  return rows
    .sort((a, b) => {
      const aCap = Number.isFinite(a.marketCap) ? a.marketCap : -1;
      const bCap = Number.isFinite(b.marketCap) ? b.marketCap : -1;
      return bCap - aCap;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function render(rows) {
  tableBodyEl.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.rank}</td>
        <td>${row.name}${row.isBGEO ? '<span class="badge">Added candidate</span>' : ''}</td>
        <td>${row.ticker ?? 'N/A'}</td>
        <td>${formatPrice(row.price)}</td>
        <td>${formatCap(row.marketCap)}</td>
      </tr>
    `,
    )
    .join('');

  totalCountEl.textContent = String(rows.length);
  const bgeo = rows.find((row) => row.isBGEO);

  if (bgeo) {
    bgeoRankEl.textContent = `#${bgeo.rank} of ${rows.length}`;
    bgeoCapEl.textContent = formatCap(bgeo.marketCap);
  }
}

function injectBGEO(rows) {
  if (rows.some((row) => row.ticker === BGEO.ticker || row.name.toLowerCase().includes('bgeo'))) {
    return rows.map((row) => ({ ...row, isBGEO: row.ticker === BGEO.ticker }));
  }

  const seed = simpleHash(BGEO.ticker);
  return [
    ...rows,
    {
      ...BGEO,
      price: Number((95 + (seed % 900) / 10).toFixed(2)),
      marketCap: 5_200_000_000 + (seed % 300_000_000),
      updatedAt: new Date().toISOString(),
    },
  ];
}

async function loadTracker() {
  refreshBtn.disabled = true;
  statusEl.textContent = 'Loading FTSE data from data/ftse100.json...';

  try {
    let rows;
    let usedFallback = false;

    try {
      rows = await loadJsonData();
    } catch (error) {
      usedFallback = true;
      rows = generateFallbackRows();
      console.warn('Could not load data/ftse100.json. Using deterministic fallback dataset.', error);
    }

    const ranked = rankRows(injectBGEO(rows));
    render(ranked);

    if (usedFallback) {
      statusEl.textContent =
        'Could not load data/ftse100.json. Showing built-in deterministic fallback dataset.';
    } else {
      const updatedAt = ranked.find((row) => row.updatedAt)?.updatedAt;
      statusEl.textContent = updatedAt
        ? `Loaded snapshot updated at ${new Date(updatedAt).toLocaleString('en-GB')}.`
        : 'Loaded snapshot from data/ftse100.json.';
    }
  } catch (error) {
    console.error(error);
    statusEl.textContent = `Failed to render tracker: ${error.message}`;
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadTracker);
loadTracker();
