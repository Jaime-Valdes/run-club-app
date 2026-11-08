import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /attendance and /races are both API prefixes and page URLs, so browser
// navigations (a hard refresh, for example) have to reach the app instead.
const backend = {
  target: "http://localhost:8000",
  changeOrigin: true,
  bypass: (req) => (req.headers.accept?.includes("text/html") ? "/index.html" : undefined),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/users": backend,
      "/clubs": backend,
      "/runs": backend,
      "/attendance": backend,
      "/races": backend,
    },
  },
})
