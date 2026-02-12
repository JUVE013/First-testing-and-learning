# FTSE 100 Tracker – BGEO

Responsive browser app that:

1. Loads FTSE 100 snapshot data from `data/ftse100.json`.
2. Ranks constituents by market cap.
3. Injects BGEO (`BGEO.L`) and shows BGEO projected rank.
4. Falls back to a built-in deterministic dataset if JSON is missing/unavailable.

## Files

- `index.html` – app structure.
- `style.css` – responsive styles (system fonts only).
- `script.js` – JSON loading, ranking, BGEO insertion, fallback handling.
- `data/ftse100.json` – local data snapshot consumed by frontend.

## Live-ish data automation (Option 3)

A GitHub Action updates `data/ftse100.json` every 15 minutes by scraping the FTSE 100 constituents table from LSE:

- Workflow: `.github/workflows/update-ftse-data.yml`
- Scraper script: `scripts/update-ftse100.mjs`
- Source URL: <https://www.londonstockexchange.com/indices/ftse-100/constituents/table>

## Run locally

```bash
python3 -m http.server 4173
```

Open:

- <http://127.0.0.1:4173>

## Verify it works

- Table loads from `data/ftse100.json` and shows name, ticker, price, market cap.
- BGEO appears with `Added candidate` badge and projected rank.
- Status message shows either:
  - snapshot timestamp (JSON loaded), or
  - fallback warning if JSON is missing/fails.
