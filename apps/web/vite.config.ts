import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const ReactCompilerConfig = {
  target: "19",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
    tailwindcss(),
  ],
});
