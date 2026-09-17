import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  /* relative base so the build runs from any path — a Pages project URL,
     a subfolder, or a phone home-screen shortcut */
  base: "./",
  plugins: [react()],
})
