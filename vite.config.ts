import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web", "onnxruntime-web/webgpu"],
  },
  build: {
    rollupOptions: {
      output: {
        // The libraries every page shares, split by what they are. One
        // undifferentiated vendor blob has to be re-downloaded and re-parsed
        // whenever any dependency changes; split this way a release usually
        // invalidates one of them, and an older device parses them as separate,
        // smaller units rather than one long block.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id))
            return "vendor-react";
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id))
            return "vendor-motion";
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          if (id.includes("node_modules/@radix-ui")) return "vendor-radix";
          if (id.includes("node_modules/@tanstack")) return "vendor-query";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
        },
      },
    },
  },
}));
