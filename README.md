# Hoops Hub – Live Scores

A focused Vite + React app for browsing live ladders and fixtures from BasketballConnect competitions.

## Getting started
1. Install Node.js 18 or newer.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Configuration
1. Copy `.env.example` to `.env`.
2. Provide your BasketballConnect details:
   - `VITE_ORG_KEY` – organisation key
   - `VITE_YEAR_REF_ID` – year reference ID (numeric)
   - `VITE_USE_PROXY` – optional. Set to `true` to route calls through the built-in proxy (default `false`).

If you do not have these values during development, you can still interact with the app by entering
them in the “Connection settings” panel rendered on the page. The values are stored locally in the
browser and reused on subsequent visits.

### Troubleshooting (CORS)
If you encounter CORS errors in the browser or your network blocks the BasketballConnect APIs, set
`VITE_USE_PROXY=true`. Requests will then be sent to the bundled Vercel serverless endpoints at
`/api/bc/*`, which relay data from BasketballConnect with edge caching.

## Deployment
### Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_ORG_KEY`, `VITE_YEAR_REF_ID`, `VITE_USE_PROXY`

Once deployed, Vercel will rebuild automatically on pushes to the default branch.

### Optional: GitHub Pages tip
If deploying to GitHub project pages, update `vite.config.js` to set `base` to `'/<repo>/'` before building.

## License
MIT © Hoops Hub contributors
