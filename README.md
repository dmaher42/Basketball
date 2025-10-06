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

## Add tournaments by organisation key
The app can look up live BasketballConnect data for any organisation/year once you know their identifiers.

1. Open the app and scroll to the **Tournaments** card at the top of the page.
2. Paste the BasketballConnect **Organisation key** into the “Organisation key” field.
3. Enter the season’s **Year reference ID** (the same `yearRefId` value BasketballConnect uses in its URLs).
4. Click **Search**. The app calls the BasketballConnect competitions API to confirm the combination exists.
5. When results are found, press **Add “Tournament name”** to save it. The tournament becomes the active context immediately and persists in your browser’s local storage so it’s ready next time you load the app.
6. Switch between saved tournaments using the “Active tournament” dropdown, or remove a saved tournament with **Remove this tournament**.

### Where are saved tournaments stored?

- Tournaments you add are written to `localStorage` in your browser under the keys `bc:tournamentContexts` (the full list) and `bc:activeTournamentContextId` (the currently selected one).
- Because they are stored locally, each browser/device keeps its own list. Clearing site data or using a new browser profile resets the list back to the default Murray Bridge Carnival context.

### Find a BasketballConnect organisation key
1. Sign in to [BasketballConnect](https://websites.mygameday.app/comp) and open any page that belongs to the organisation you need.
2. Look at the address bar. Organisation pages include `organisationKey=<value>` (e.g. `.../organisationKey=a1b2c3`); copy that value.
3. If you are browsing via the admin interface, you can also copy the value shown beside **Organisation key** in the Organisation Details panel. It matches the URL parameter.
4. Paste the copied key into the **Organisation key** field in the Hoops Hub Tournaments card and combine it with the correct BasketballConnect **Year reference ID**.

## Notes
- If using GitHub Pages, ensure `vite.config.js` `base` matches the repo name exactly.
- You can change the initial team by editing `selectedTeamId` in `src/App.jsx`.
- Add more teams/fixtures by editing `src/data/mb_carnival.json`.
