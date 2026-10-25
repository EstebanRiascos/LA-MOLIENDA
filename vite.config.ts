import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';
import fs from 'node:fs';

function copyPreloadPlugin() {
  return {
    name: 'copy-preload',
    buildStart() {
      const src = path.resolve(__dirname, 'electron/preload.cjs');
      const dest = path.resolve(__dirname, 'dist-electron/preload.cjs');
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    copyPreloadPlugin(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'exceljs': path.resolve(__dirname, 'node_modules/exceljs/dist/exceljs.min.js'),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: [
        '**/DocumentosCorazon/**',
        '**/*.docx',
        '**/*.xlsx',
        '**/*.xls',
        '**/*.pdf',
        '**/release/**',
        '**/dist/**',
        '**/dist-electron/**',
        '**/.git/**',
        '**/.edge*/**',
        '**/.tmp_edge*/**',
      ],
    },
  },
});
