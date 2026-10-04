import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base matches the GitHub Pages path: https://rowanflynnpilot.github.io/first-course/
export default defineConfig({
  base: '/first-course/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // The libraries change far less often than the app, so each gets its own
        // file that the phone keeps cached across deploys.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
