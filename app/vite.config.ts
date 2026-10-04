import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base matches the GitHub Pages path: https://rowanflynnpilot.github.io/first-course/
export default defineConfig({
  base: '/first-course/',
  plugins: [react()],
})
