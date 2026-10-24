# ChatGPT Usage by State (static app)

A static, no-build web app: modeled ChatGPT monthly users by US state, how the US compares globally, and 6 and 12 month scenarios.
Modeled estimates, not measurements. See the "Method and sources" tab for assumptions, references and the age of each input.

## Files
- `index.html`  page markup
- `styles.css`  styles (light and dark mode follow the visitor's system setting)
- `app.js`      the app (maps, charts, tables, tabs)
- `shim.js`     tiny runtime that feeds the bundled data to `app.js`
- `data.js`     all datasets, bundled (edit here to change numbers, sources, dates or assumptions)
- `d3.min.js`   d3 v7, bundled so the app makes no network requests
- `.nojekyll`   tells GitHub Pages to serve files as-is

No server, build step or network access is needed. To preview locally: open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## Host on GitHub Pages
1. Create a repository and add all files at the top level.
2. Settings > Pages > Deploy from a branch > `main` / root.
3. Note: Pages sites are public. A private repository does not make the site private unless your plan supports private Pages.

## Host on AWS
- S3 static website or S3 + CloudFront: upload all files to a bucket, set `index.html` as the index document.
- For internal-only access, put CloudFront behind your SSO or restrict by IP/WAF rather than leaving the bucket public.

## Attribution
Contains data from OpenAI Signals, licensed CC BY 4.0. Other inputs are third-party estimates listed on the Method and sources tab.
Keep the "Modeled estimates, not measured" label and the data-vintage section when sharing.
