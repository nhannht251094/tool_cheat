import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";

const buildId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

export default defineConfig({
  base: "/",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_ID__: JSON.stringify(buildId)
  }
});
