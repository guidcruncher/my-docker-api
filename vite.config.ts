import vue from "@vitejs/plugin-vue"
import path from "path"
import Components from "unplugin-vue-components/vite"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue(),
    Components({
      dirs: ["src/components"],
      extensions: ["vue"],
      directoryAsNamespace: false,
      dts: true,
    }),
  ],
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
  },
})
