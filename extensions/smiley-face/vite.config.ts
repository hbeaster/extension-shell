import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue({ customElement: true })],
  // Lib-mode ES output keeps vue's esm-bundler `process.env.NODE_ENV` checks
  // unless they are defined away; without this the bundle crashes in the browser.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'smiley-face.js',
    },
  },
})
