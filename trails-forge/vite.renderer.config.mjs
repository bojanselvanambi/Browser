import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  build: {
    outDir: resolve(process.cwd(), '.vite/renderer/main_window'),
  }
});
