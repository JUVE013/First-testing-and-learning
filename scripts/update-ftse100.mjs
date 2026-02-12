import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://www.londonstockexchange.com/indices/ftse-100/constituents/table';
const URLS = [
  BASE_URL,
  `${BASE_URL}?page=2`,
  `${BASE_URL}?page=3`,
  `${BASE_URL}?page=4`,
  `${BASE_URL}?page=5`,
];

function cleanNumber(raw) {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function pickCell(row, map, keys) {
  for (const key of keys) {
    const idx = map[key];
    if (idx !== undefined && row[idx]) return row[idx].trim();
  }
  return null;
}

async function scrapeTableOnCurrentPage(page) {
  const parsed = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return { headers: [], rows: [] };

    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').trim().toLowerCase(),
    );

    const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim()),
    );

    return { headers, rows };
  });

  const map = {};
  parsed.headers.forEach((header, idx) => {
    if (header.includes('company')) map.name = idx;
    if (header.includes('ticker') || header.includes('epic')) map.ticker = idx;
    if (header.includes('price')) map.price = idx;
    if (header.includes('market cap')) map.marketCap = idx;
  });

  return { parsed, map };
}

async function scrapeConstituents() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const updatedAt = new Date().toISOString();
    const byKey = new Map();

    for (const url of URLS) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(5000);

      const { parsed, map } = await scrapeTableOnCurrentPage(page);

      const companies = parsed.rows
        .map((row) => {
          const name = pickCell(row, map, ['name']) || row[0] || null;
          const ticker = pickCell(row, map, ['ticker']);
          const priceRaw = pickCell(row, map, ['price']);
          const marketCapRaw = pickCell(row, map, ['marketCap']);

          return {
            name,
            ticker: ticker || null,
            price: cleanNumber(priceRaw),
            marketCap: cleanNumber(marketCapRaw),
            updatedAt,
          };
        })
        .filter((c) => c.name);

      for (const c of companies) {
        const key = `${(c.ticker || '').toUpperCase()}|${c.name.toUpperCase()}`;
        if (!byKey.has(key)) byKey.set(key, c);
      }

      console.log(`Scraped ${companies.length} rows from ${url}`);
    }

    const all = Array.from(byKey.values());

    if (all.length < 90) {
      console.warn(
        `Warning: Expected ~100 constituents, got ${all.length}. Continuing with partial data (pagination/rendering may have limited results).`,
      );
    }

    return {
      source: BASE_URL,
      updatedAt,
      companies: all,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const data = await scrapeConstituents();
  const outPath = path.join(process.cwd(), 'data', 'ftse100.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${data.companies.length} rows to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
