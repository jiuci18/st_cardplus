import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

type BuildChannel = 'stable' | 'dev';

const getGitVersionInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    return { commitHash, commitCount };
  } catch (e) {
    console.error('Failed to get git info:', e);
    return { commitHash: 'unknown', commitCount: 'unknown' };
  }
};

const getPackageVersion = () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };
  return packageJson.version;
};

const getBuildChannel = (): BuildChannel => {
  const branchName = (process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || '').trim();
  return branchName === 'main' ? 'stable' : 'dev';
};

const buildMetadataPlugin = () => {
  let outDir = path.resolve(__dirname, 'dist');

  return {
    name: 'build-metadata-plugin',
    configResolved(config: { build: { outDir: string } }) {
      outDir = path.resolve(__dirname, config.build.outDir);
    },
    closeBundle() {
      const metadata = {
        version: appSemver,
        channel: appChannel,
        buildTime: new Date().toISOString(),
      };

      writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
    },
  };
};

const { commitHash, commitCount } = getGitVersionInfo();
const appSemver = getPackageVersion();
const appVersion = process.env.CF_PAGES_COMMIT_SHA ? process.env.CF_PAGES_COMMIT_SHA.slice(0, 7) : commitHash;
const appCommitCount = commitCount;
const appChannel = getBuildChannel();

export default defineConfig({
  server: {
    host: true,
    port: 3066,
    strictPort: true,
  },
  plugins: [
    vue(),
    tailwindcss(),
    buildMetadataPlugin(),
  ],
  resolve: { // 添加 resolve 配置
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'fs': path.resolve(__dirname, 'src/polyfills/fs.js'),
      'path': path.resolve(__dirname, 'src/polyfills/path.js'),
      'os': path.resolve(__dirname, 'src/polyfills/os.js'),
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
  },
  define: {
    global: 'globalThis',
    __APP_SEMVER__: JSON.stringify(appSemver),
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT_COUNT__: JSON.stringify(appCommitCount),
    __APP_CHANNEL__: JSON.stringify(appChannel),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    exclude: [],
    include: ['js-yaml', 'ejs', 'vue', 'vuedraggable'],
    force: true, // 强制重新预优化
  },
  build: {
    outDir: 'dist', // 打包输出目录
    minify: 'terser',
    cssCodeSplit: true, // 启用CSS代码分割
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js', // 分割后的文件命名规则
      },
      external: [], // 确保不排除 Vue
    },
    chunkSizeWarningLimit: 4096,
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
