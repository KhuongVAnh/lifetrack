import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const allowedHosts = railwayDomain ? [railwayDomain, ".up.railway.app"] : [".up.railway.app"];

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts,
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    strictPort: true,
    allowedHosts,
  },
});
