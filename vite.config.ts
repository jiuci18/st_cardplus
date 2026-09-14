import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { createBuildMetadata } from './scripts/build-metadata.ts';

const rootDir = import.meta.dirname;
const outDir = 'dist';
const buildMetadata = createBuildMetadata({ rootDir, outDir });

export default defineConfig({
  server: {
    host: true,
    port: 3066,
    strictPort: true,
  },
  plugins: [
    vue(),
    tailwindcss(),
    buildMetadata.plugin,
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      'ejs': path.resolve(rootDir, 'node_modules/ejs/lib/cjs/ejs.js'),
      'fs': path.resolve(rootDir, 'src/polyfills/fs.js'),
      'path': path.resolve(rootDir, 'src/polyfills/path.js'),
    },
  },
  define: {
    global: 'globalThis',
    ...buildMetadata.define,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['js-yaml', 'ejs', 'vue', 'vuedraggable'],
  },
  build: {
    outDir,
    rolldownOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
        manualChunks(id) {
          if (
            id.includes('/node_modules/vue/') ||
            id.includes('/node_modules/@vue/') ||
            id.includes('/node_modules/@vueuse/') ||
            id.includes('/node_modules/element-plus/')
          ) {
            return 'vue-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 4096,
  },
});
