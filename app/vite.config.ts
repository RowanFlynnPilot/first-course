import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * A content security policy for the built page, as a meta tag: GitHub Pages
 * cannot send headers. Scripts, styles, fonts and images come only from the
 * app itself, and the only other site it talks to is its Supabase project,
 * so an injected script has nowhere to send what it reads. The development
 * server is left alone: it injects scripts and styles of its own.
 */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      if (supabaseUrl === undefined || supabaseUrl === '') throw new Error('VITE_SUPABASE_URL is not set, so the build has no Supabase address for its policy')
      const policy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "font-src 'self'",
        "img-src 'self' data:",
        "manifest-src 'self'",
        `connect-src 'self' ${new URL(supabaseUrl).origin}`,
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join('; ')
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
    },
  }
}

// base matches the GitHub Pages path: https://rowanflynnpilot.github.io/first-course/
export default defineConfig(({ mode }) => ({
  base: '/first-course/',
  plugins: [react(), contentSecurityPolicy(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL)],
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
}))
