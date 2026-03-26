import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

type BuildChannel = 'stable' | 'dev';
const outDir = 'dist';

const getGitVersionInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    const commitTitle = execSync('git log -1 --pretty=%s').toString().trim();
    const commitBody = execSync('git log -1 --pretty=%b').toString().trim();
    return { commitHash, commitCount, commitTitle, commitBody };
  } catch (e) {
    console.error('Failed to get git info:', e);
    return { commitHash: 'unknown', commitCount: 'unknown', commitTitle: '', commitBody: '' };
  }
};

const getPackageVersion = () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };
  return packageJson.version;
};

const getBuildChannel = (): BuildChannel => {
  const channelOverride = (process.env.APP_CHANNEL_OVERRIDE || '').trim();
  if (channelOverride === 'stable' || channelOverride === 'dev') {
    return channelOverride;
  }

  const branchName = (process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || '').trim();
  return branchName === 'main' ? 'stable' : 'dev';
};

const { commitHash, commitCount, commitTitle, commitBody } = getGitVersionInfo();
const buildInfo = {
  appSemver: getPackageVersion(),
  appVersion: process.env.CF_PAGES_COMMIT_SHA ? process.env.CF_PAGES_COMMIT_SHA.slice(0, 7) : commitHash,
  appCommitCount: commitCount,
  appChannel: getBuildChannel(),
  latestCommitTitle: commitTitle,
  latestCommitDescription: commitBody,
};

const buildMetadataPlugin = () => ({
  name: 'build-metadata-plugin',
  closeBundle() {
    const metadata = {
      version: buildInfo.appSemver,
      channel: buildInfo.appChannel,
      commitHash,
      updateTitle: buildInfo.latestCommitTitle,
      updateDescription: buildInfo.latestCommitDescription,
      buildTime: new Date().toISOString(),
    };

    writeFileSync(path.join(__dirname, outDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
  },
});

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
  resolve: {
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
    __APP_SEMVER__: JSON.stringify(buildInfo.appSemver),
    __APP_VERSION__: JSON.stringify(buildInfo.appVersion),
    __APP_COMMIT_COUNT__: JSON.stringify(buildInfo.appCommitCount),
    __APP_CHANNEL__: JSON.stringify(buildInfo.appChannel),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['js-yaml', 'ejs', 'vue', 'vuedraggable'],
  },
  build: {
    outDir, // 打包输出目录
    rolldownOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js', // 分割后的文件命名规则
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
    chunkSizeWarningLimit: 4096,
  },
});
