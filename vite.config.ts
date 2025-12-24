import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows process.env access in the browser
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});