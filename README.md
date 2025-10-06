# Hoops Hub – Murray Bridge Carnival (MVP)

Mobile-first React app (Vite) that shows team schedule, ladder, league draw and player stats.
Currently uses mock data in `src/data/mb_carnival.json`.

## Run locally
1. Install Node.js 18+
2. Install deps: `npm install`
3. Start dev server: `npm run dev`

## Deploy options
### A) GitHub Pages (static hosting)
1. Create a **public** GitHub repo, e.g. `hoops-hub-murray-bridge`
2. In `vite.config.js`, set `base` to `'/hoops-hub-murray-bridge/'` (must match your repo name with leading/trailing slashes)
3. Commit and push the project
4. Install dependencies (includes `gh-pages`): `npm install`
5. Deploy to Pages: `npm run deploy` (builds the site and publishes `dist/` to the `gh-pages` branch)
6. In GitHub, Settings → Pages → set branch to `gh-pages`. Your site will be at `https://<username>.github.io/<repo>/`

### B) Netlify
1. Create a Netlify account and **New site from Git** → select your repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Netlify will build and deploy automatically on push

## Swap to real data later
- Replace `src/data/mb_carnival.json` with live data (same shape). You can fetch from your own API or GitHub raw JSON.
- To fetch from GitHub Raw, for example, use:
  ```js
  // in App.jsx
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/<you>/<repo>/main/data/mb_carnival.json')
      .then(r => r.json()).then(setLeague)
  }, [])
  ```
- Keep the file shape the same: `{ id, name, org, season, teams[], ladder[], fixtures[], playerStats{} }`

## Notes
- If using GitHub Pages, ensure `vite.config.js` `base` matches the repo name exactly.
- You can change the initial team by editing `selectedTeamId` in `src/App.jsx`.
- Add more teams/fixtures by editing `src/data/mb_carnival.json`.
