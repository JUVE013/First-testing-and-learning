# FTSE 100 Tracker – BGEO

This is a small responsive web app that:

1. Loads the **current FTSE 100 constituents** from Wikipedia.
2. Tries to fetch live quote data (price + market cap).
3. Adds **BGEO.L** to the list.
4. Ranks all companies by market cap and shows BGEO's projected rank.
5. Falls back to a fully-filled deterministic dataset if live quote APIs are blocked.

## Quick start

From the project folder:

```bash
python3 -m http.server 4173
```

Then open:

- `http://127.0.0.1:4173`

## How to check it is working

### 1) UI checks

- You should see a table with ranked rows.
- You should see summary cards for:
  - Total companies tracked
  - BGEO projected rank
  - BGEO market cap

### 2) Status message check

Look at the status text above the table:

- If live quotes are available, it shows an updated timestamp.
- If the live endpoint is blocked, it shows:
  - `Live quote API is blocked in this environment, so a fully-filled fallback dataset is shown for all constituents.`

### 3) BGEO check

In the table, BGEO row has an **"Added candidate"** badge and a rank.

## Notes

- In restricted environments (like some CI/proxy setups), quote APIs can be blocked.
- The fallback path is expected in that case and still gives a complete ranked table for functional testing.
