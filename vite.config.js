import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If deploying to GitHub Pages, set "base" to '/<REPO_NAME>/' (including trailing slashes).
// Example: base: '/hoops-hub-murray-bridge/'
export default defineConfig({
  plugins: [react()],
  base: '/hoops-hub-murray-bridge/'
})
