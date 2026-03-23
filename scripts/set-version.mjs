import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2]?.trim();

if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error(`Invalid semver tag: ${version ?? ''}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const updateJsonVersion = (filePath) => {
  const fullPath = path.join(rootDir, filePath);
  const content = JSON.parse(readFileSync(fullPath, 'utf8'));
  content.version = version;
  writeFileSync(fullPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
};

const updateCargoVersion = (filePath) => {
  const fullPath = path.join(rootDir, filePath);
  const content = readFileSync(fullPath, 'utf8');
  const versionLinePattern = /^version\s*=\s*"[^"]+"$/m;
  if (!versionLinePattern.test(content)) {
    console.error(`Failed to update version in ${filePath}`);
    process.exit(1);
  }

  const nextContent = content.replace(versionLinePattern, `version = "${version}"`);
  writeFileSync(fullPath, nextContent, 'utf8');
};

updateJsonVersion('package.json');
updateJsonVersion('src-tauri/tauri.conf.json');
updateCargoVersion('src-tauri/Cargo.toml');
