// vite.config.ts
import { defineConfig } from "file:///C:/Users/PMF/drivercom-gui/node_modules/.deno/vite@6.0.7/node_modules/vite/dist/node/index.js";
import deno from "file:///C:/Users/PMF/drivercom-gui/node_modules/.deno/@deno+vite-plugin@1.0.2/node_modules/@deno/vite-plugin/dist/index.js";
import solid from "file:///C:/Users/PMF/drivercom-gui/node_modules/.deno/vite-plugin-solid@2.11.0/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import tsconfigPaths from "file:///C:/Users/PMF/drivercom-gui/node_modules/.deno/vite-tsconfig-paths@5.1.4/node_modules/vite-tsconfig-paths/dist/index.js";
import process from "node:process";
var host = process.env.TAURI_DEV_HOST;
var vite_config_default = defineConfig({
  plugins: [deno(), solid(), tsconfigPaths({ root: "./" })],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? {
      protocol: "ws",
      host,
      port: 1421
    } : void 0,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlUm9vdCI6ICJDOlxcVXNlcnNcXFBNRlxcZHJpdmVyY29tLWd1aVxcIiwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQTUZcXFxcZHJpdmVyY29tLWd1aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcUE1GXFxcXGRyaXZlcmNvbS1ndWlcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1BNRi9kcml2ZXJjb20tZ3VpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBkZW5vIGZyb20gXCJAZGVuby92aXRlLXBsdWdpblwiO1xuaW1wb3J0IHNvbGlkIGZyb20gXCJ2aXRlLXBsdWdpbi1zb2xpZFwiO1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSBcInZpdGUtdHNjb25maWctcGF0aHNcIjtcbmltcG9ydCBwcm9jZXNzIGZyb20gXCJub2RlOnByb2Nlc3NcIjtcblxuLy8gQHRzLWV4cGVjdC1lcnJvciBwcm9jZXNzIGlzIGEgbm9kZWpzIGdsb2JhbFxuY29uc3QgaG9zdCA9IHByb2Nlc3MuZW52LlRBVVJJX0RFVl9IT1NUO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2Rlbm8oKSwgc29saWQoKSwgdHNjb25maWdQYXRocyh7IHJvb3Q6IFwiLi9cIiB9KV0sXG5cbiAgLy8gVml0ZSBvcHRpb25zIHRhaWxvcmVkIGZvciBUYXVyaSBkZXZlbG9wbWVudCBhbmQgb25seSBhcHBsaWVkIGluIGB0YXVyaSBkZXZgIG9yIGB0YXVyaSBidWlsZGBcbiAgLy9cbiAgLy8gMS4gcHJldmVudCB2aXRlIGZyb20gb2JzY3VyaW5nIHJ1c3QgZXJyb3JzXG4gIGNsZWFyU2NyZWVuOiBmYWxzZSxcbiAgLy8gMi4gdGF1cmkgZXhwZWN0cyBhIGZpeGVkIHBvcnQsIGZhaWwgaWYgdGhhdCBwb3J0IGlzIG5vdCBhdmFpbGFibGVcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMTQyMCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGhvc3Q6IGhvc3QgfHwgZmFsc2UsXG4gICAgaG1yOiBob3N0XG4gICAgICA/IHtcbiAgICAgICAgcHJvdG9jb2w6IFwid3NcIixcbiAgICAgICAgaG9zdCxcbiAgICAgICAgcG9ydDogMTQyMSxcbiAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICAgIHdhdGNoOiB7XG4gICAgICAvLyAzLiB0ZWxsIHZpdGUgdG8gaWdub3JlIHdhdGNoaW5nIGBzcmMtdGF1cmlgXG4gICAgICBpZ25vcmVkOiBbXCIqKi9zcmMtdGF1cmkvKipcIl0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3USxTQUFTLG9CQUFvQjtBQUNyUyxPQUFPLFVBQVU7QUFDakIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sYUFBYTtBQUdwQixJQUFNLE9BQU8sUUFBUSxJQUFJO0FBR3pCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLGNBQWMsRUFBRSxNQUFNLEtBQUssQ0FBQyxDQUFDO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLeEQsYUFBYTtBQUFBO0FBQUEsRUFFYixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNLFFBQVE7QUFBQSxJQUNkLEtBQUssT0FDRDtBQUFBLE1BQ0EsVUFBVTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLE1BQU07QUFBQSxJQUNSLElBQ0U7QUFBQSxJQUNKLE9BQU87QUFBQTtBQUFBLE1BRUwsU0FBUyxDQUFDLGlCQUFpQjtBQUFBLElBQzdCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
