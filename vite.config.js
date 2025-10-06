import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If deploying to GitHub Pages, set "base" to '/<REPO_NAME>/' (including trailing slashes).
// Example: base: '/hoops-hub-murray-bridge/'
export default defineConfig({
  plugins: [react()],
  // Use a relative base so that the built assets can be found regardless of
  // the hosting path (e.g. GitHub Pages project sites or custom domains).
  base: './'
})
