import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function fail(message) {
  console.error(`[verify-pack] ${message}`);
  process.exit(1);
}

const artifactsDirArg = process.argv[2];
if (!artifactsDirArg) {
  fail('Usage: node ./scripts/verify-pack.mjs <artifacts-dir>');
}

const artifactsDir = path.resolve(process.cwd(), artifactsDirArg);
let tarballPath = '';
try {
  const tarballs = fs
    .readdirSync(artifactsDir)
    .filter((entry) => entry.endsWith('.tgz'))
    .sort();
  const firstTarball = tarballs[0];
  if (firstTarball) {
    tarballPath = path.join(artifactsDir, firstTarball);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Unable to read artifacts directory ${artifactsDir}: ${message}`);
}

if (!tarballPath) {
  fail(`No .tgz file found in ${artifactsDir}`);
}

const tarContents = execFileSync('tar', ['-tf', tarballPath], { encoding: 'utf8' });
const files = new Set(tarContents.split('\n').filter(Boolean));

const packedPackageJsonRaw = execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], {
  encoding: 'utf8',
});
const packedPackageJson = JSON.parse(packedPackageJsonRaw);

const requiredEntries = ['package/package.json', 'package/README.md', 'package/CHANGELOG.md'];
const packageEntryFields = ['main', 'react-native', 'browser', 'types'];

for (const field of packageEntryFields) {
  const entry = packedPackageJson[field];
  if (typeof entry === 'string' && entry.length > 0) {
    requiredEntries.push(`package/${entry}`);
  }
}

for (const required of requiredEntries) {
  if (!files.has(required)) {
    fail(`Packed artifact missing required entry: ${required}`);
  }
}

const sideEffects = packedPackageJson.sideEffects;
if (sideEffects !== false) {
  fail(`Expected sideEffects=false, got ${String(sideEffects)}`);
}

const isPrivatePackage = packedPackageJson.private === true;
if (!isPrivatePackage && packedPackageJson.publishConfig?.access !== 'public') {
  fail(
    `Expected publishConfig.access=public for publishable package, got ${String(packedPackageJson.publishConfig?.access)}`,
  );
}

if (!Array.isArray(packedPackageJson.keywords) || packedPackageJson.keywords.length === 0) {
  fail('Expected non-empty keywords array');
}

console.log(`[verify-pack] OK ${path.basename(tarballPath)}`);
