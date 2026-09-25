import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig({
  // Absolute, not './'. With a relative base every asset URL is resolved
  // against the current path, so on a two-segment route like /u/amina the
  // browser asks for /u/assets/index-*.js — which nginx answers with
  // index.html via the SPA fallback, and the browser refuses to execute HTML
  // as a module. The app did not load at all on a cold visit to any profile
  // link, which is the most-shared kind of link there is. The same resolution
  // broke the favicon and manifest hrefs.
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    host: true,
    // The source is bind-mounted from a Windows host into Linux, where inotify
    // events do not cross the boundary — without polling, HMR never fires.
    watch: { usePolling: true, interval: 300 },
    // The browser reaches the dev server on 3030 (the published port), so HMR
    // must advertise that port rather than the in-container 5173.
    hmr: { clientPort: 3030 },
    proxy: {
      "/api": { target: "http://gateway:8000", changeOrigin: true },
      "/media": { target: "http://gateway:8000", changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
