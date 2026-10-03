# Business Deal Analyzer

A lightweight MVP for underwriting small-business acquisitions.

## What it does

- Captures a business listing URL for reference
- Calculates price/SDE and SDE margin
- Normalizes seller discretionary earnings
- Models acquisition debt service
- Calculates DSCR, cash-on-cash return, and payback period
- Estimates fair value from comparable SDE and revenue multiples
- Compares the business against a property investment using the same cash
- Runs bull/base/stress/severe scenarios
- Produces BUY / NEGOTIATE / PASS guidance
- Suggests a modeled maximum price and opening offer

## Important MVP limitation

This version does **not** automatically scrape BizBuySell or other marketplaces. Marketplace extraction should be added only with source-specific methods that comply with the site's terms and technical access rules. For now, paste the listing URL for reference and enter the financial data shown in the listing.

## Run locally

No build tools are required.

1. Clone the repository.
2. Open `index.html` in a browser.

Or run a simple local web server:

```bash
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

## Free deployment

### GitHub Pages

Because this MVP is fully static, GitHub Pages is the easiest free host.

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: **main**.
5. Folder: **/(root)**.
6. Save.

GitHub will provide a URL similar to:

```
https://aasys12.github.io/business-deal-analyzer/
```

### Cloudflare Pages

Cloudflare Pages is also a good free option if you want to add server-side functions later.

Connect this repository in Cloudflare Pages and use:

- Framework preset: None
- Build command: leave blank
- Build output directory: `/` or repository root, depending on the UI

## Next version

The next useful version should add:

- Listing text parser
- Source adapters for compliant listing ingestion
- Saved deals
- User accounts
- Comparable-business dataset
- Nearby commercial real-estate comps
- Demographic/traffic context
- SBA and conventional financing scenarios
- PDF investment memo export
- Sensitivity charts
- Due-diligence checklist

## Disclaimer

Educational underwriting tool only. It is not legal, tax, accounting, brokerage, appraisal, or lending advice.


## Cloudflare Workers deployment

This repo is also configured for Cloudflare Workers with Static Assets.
The dashboard deploy command can remain:

```bash
npx wrangler deploy
```

Wrangler reads `wrangler.jsonc`, publishes the static site from `public/`, and routes `/api/import` through `src/index.js`.
