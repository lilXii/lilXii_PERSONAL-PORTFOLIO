import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  build: {
    chunkSizeWarningLimit: 850,
    rollupOptions: { output: { manualChunks: id => id.includes('/three/') ? 'three' : undefined } },
  },
});
