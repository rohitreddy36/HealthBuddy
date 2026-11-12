import { defineConfig } from "nitro/config";

export default defineConfig({
  vercel: { functions: { maxDuration: 60 } },
});
