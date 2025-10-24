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

If you do not have these values during development, you can still interact with the app by entering
them in the “Connection settings” panel rendered on the page. The values are stored locally in the
browser and reused on subsequent visits.

## Deployment
### Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_ORG_KEY`, `VITE_YEAR_REF_ID`

Once deployed, Vercel will rebuild automatically on pushes to the default branch.

### Optional: GitHub Pages tip
If deploying to GitHub project pages, update `vite.config.js` to set `base` to `'/<repo>/'` before building.

## License
MIT © Hoops Hub contributors
