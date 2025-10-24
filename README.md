# Hoops Hub – Live Scores

Mobile-first React app (Vite) that shows live ladders and fixtures for BasketballConnect competitions.

## Run locally
1. Install Node.js 18+
2. Install deps: `npm install`
3. Start dev server: `npm run dev`

## Configuration
1. Copy `.env.example` to `.env`.
2. Fill in:
   - `VITE_ORG_KEY` – your BasketballConnect organisation key
   - `VITE_YEAR_REF_ID` – the BasketballConnect year reference ID to load

## Deploy options
### A) GitHub Pages (static hosting)
1. Create a **public** GitHub repo, e.g. `hoops-hub`
2. In `vite.config.js`, set `base` to `'/hoops-hub/'` (must match your repo name with leading/trailing slashes)
3. Commit and push the project
4. Install dependencies (includes `gh-pages`): `npm install`
5. Deploy to Pages: `npm run deploy` (builds the site and publishes `dist/` to the `gh-pages` branch)
6. In GitHub, Settings → Pages → set branch to `gh-pages`. Your site will be at `https://<username>.github.io/<repo>/`

### B) Netlify
1. Create a Netlify account and **New site from Git** → select your repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Netlify will build and deploy automatically on push

### C) Vercel
- Build command: `npm run build`
- Output directory: `dist`

## Notes
- If using GitHub Pages, ensure `vite.config.js` `base` matches the repo name exactly.
- Set `VITE_ORG_KEY` and `VITE_YEAR_REF_ID` in `.env` before building to load live data.
