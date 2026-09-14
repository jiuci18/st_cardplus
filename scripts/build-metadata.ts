//! Resolves build identity and emits the production metadata manifest.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

type BuildChannel = 'stable' | 'dev';

interface BuildInfo {
  readonly appSemver: string;
  readonly appVersion: string;
  readonly appCommitCount: string;
  readonly appChannel: BuildChannel;
  readonly latestCommitTitle: string;
  readonly latestCommitDescription: string;
}

interface GitVersionInfo {
  readonly commitHash: string;
  readonly commitCount: string;
  readonly commitTitle: string;
  readonly commitBody: string;
}

interface BuildMetadataOptions {
  readonly rootDir: string;
  readonly outDir: string;
}

interface BuildMetadataIntegration {
  readonly define: Readonly<Record<string, string>>;
  readonly plugin: Plugin;
}

const getGitVersionInfo = (): GitVersionInfo => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    const commitTitle = execSync('git log -1 --pretty=%s').toString().trim();
    const commitBody = execSync('git log -1 --pretty=%b').toString().trim();
    return { commitHash, commitCount, commitTitle, commitBody };
  } catch (error) {
    console.error('Failed to get git info:', error);
    return { commitHash: 'unknown', commitCount: 'unknown', commitTitle: '', commitBody: '' };
  }
};

/** Creates build definitions and a plugin that writes metadata after a production build. */
export const createBuildMetadata = ({ rootDir, outDir }: BuildMetadataOptions): BuildMetadataIntegration => {
  const { commitHash, commitCount, commitTitle, commitBody } = getGitVersionInfo();
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf-8')) as { version: string };
  const channelOverride = process.env.APP_CHANNEL_OVERRIDE?.trim();
  const branchName = (process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || '').trim();
  const appChannel: BuildChannel =
    channelOverride === 'stable' || channelOverride === 'dev'
      ? channelOverride
      : branchName === 'main'
        ? 'stable'
        : 'dev';
  const buildInfo: BuildInfo = {
    appSemver: packageJson.version,
    appVersion: process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || commitHash,
    appCommitCount: commitCount,
    appChannel,
    latestCommitTitle: commitTitle,
    latestCommitDescription: commitBody,
  };

  return {
    define: {
      __APP_SEMVER__: JSON.stringify(buildInfo.appSemver),
      __APP_VERSION__: JSON.stringify(buildInfo.appVersion),
      __APP_COMMIT_COUNT__: JSON.stringify(buildInfo.appCommitCount),
      __APP_CHANNEL__: JSON.stringify(buildInfo.appChannel),
    },
    plugin: {
      name: 'build-metadata-plugin',
      apply: 'build',
      closeBundle() {
        const metadata = {
          version: buildInfo.appSemver,
          channel: buildInfo.appChannel,
          commitHash: buildInfo.appVersion,
          updateTitle: buildInfo.latestCommitTitle,
          updateDescription: buildInfo.latestCommitDescription,
          buildTime: new Date().toISOString(),
        };

        writeFileSync(path.join(rootDir, outDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
      },
    },
  };
};
