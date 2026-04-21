import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const allowedHosts = railwayDomain ? [railwayDomain, ".up.railway.app"] : [".up.railway.app"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: 'https://holterserver.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://holterserver.up.railway.app',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    strictPort: true,
    allowedHosts,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          sockets: ["socket.io-client"],
          toast: ["react-toastify"],
        },
      },
    },
  },
});
