import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const requiredArtifacts = ['dist/index.native.js', 'dist/index.web.js', 'dist/index.d.ts'];

for (const relativePath of requiredArtifacts) {
  const absolutePath = path.resolve(packageRoot, relativePath);
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Missing required build artifact: ${relativePath}`);
  }
}
