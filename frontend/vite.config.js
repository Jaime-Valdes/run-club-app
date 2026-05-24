import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/users": "http://localhost:8000",
      "/clubs": "http://localhost:8000",
      "/runs": "http://localhost:8000",
      "/attendance": "http://localhost:8000",
      "/races": "http://localhost:8000",
    },
  },
})
