// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: "cjs"
          // Force CommonJS output - electron module is CJS-only
        }
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          settings: resolve("src/renderer/settings.html"),
          downloads: resolve("src/renderer/downloads.html"),
          archive: resolve("src/renderer/archive.html")
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
