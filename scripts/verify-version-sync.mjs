import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error(`[verify-version-sync] ${message}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.resolve(packageRoot, 'package.json');
const changelogPath = path.resolve(packageRoot, 'CHANGELOG.md');

const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonRaw);
const packageVersion = packageJson.version;

if (typeof packageVersion !== 'string' || packageVersion.length === 0) {
  fail('Missing package.json version');
}

const changelogRaw = await readFile(changelogPath, 'utf8');
const topReleaseMatch = changelogRaw.match(/^##\s+v?(\d+\.\d+\.\d+)\b/m);
if (!topReleaseMatch) {
  fail('Unable to find top-level changelog version header like "## 0.1.0"');
}

const changelogVersion = topReleaseMatch[1];
if (!changelogVersion) {
  fail('Changelog version match was empty');
}

if (changelogVersion !== packageVersion) {
  fail(
    `Version mismatch: package.json=${packageVersion} but top changelog entry=${changelogVersion}`,
  );
}

console.log(`[verify-version-sync] OK ${packageVersion}`);
