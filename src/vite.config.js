import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build: 2026-07-06 - force clean rebuild
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html',
    },
  },
  server: { port: 5173, open: true }
})
