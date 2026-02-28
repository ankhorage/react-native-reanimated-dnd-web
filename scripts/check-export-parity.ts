import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { exportParityConfig } from '../tests/export-parity.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);

type RuntimeKeysResult = {
  keys: string[];
  importError?: string;
  requireError?: string;
  source: 'runtime' | 'runtime+static-fallback';
};

function normalizeKeys(keys: Iterable<string>): string[] {
  const ignored = new Set(exportParityConfig.ignoredKeys);

  return [...new Set(keys)]
    .filter((key) => !ignored.has(key))
    .sort((a, b) => a.localeCompare(b));
}

function setDiff(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

async function loadImportKeys(specifier: string): Promise<{ keys: string[]; error?: string }> {
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import(${JSON.stringify(specifier)})
          .then((m) => { console.log(JSON.stringify(Object.keys(m))); })
          .catch((e) => { console.error(String(e?.message ?? e)); process.exit(2); });`,
      ],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        timeout: 4_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    return { keys: JSON.parse(stdout.trim()) as string[] };
  } catch (error) {
    const message =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: string }).stderr ?? error.message).trim()
        : error instanceof Error
          ? error.message
          : String(error);
    return { keys: [], error: message };
  }
}

function loadRequireKeys(specifier: string): { keys: string[]; error?: string } {
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        '-e',
        `try {
           const mod = require(${JSON.stringify(specifier)});
           console.log(JSON.stringify(Object.keys(mod)));
         } catch (e) {
           console.error(String(e?.message ?? e));
           process.exit(2);
         }`,
      ],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        timeout: 4_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    return { keys: JSON.parse(stdout.trim()) as string[] };
  } catch (error) {
    const message =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: string }).stderr ?? error.message).trim()
        : error instanceof Error
          ? error.message
          : String(error);
    return { keys: [], error: message };
  }
}

async function loadStaticEsbuildExports(entryFile: string): Promise<string[]> {
  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    metafile: true,
    external: [
      'react',
      'react/jsx-runtime',
      'react-native',
      'react-native-gesture-handler',
      'react-native-reanimated',
    ],
    logLevel: 'silent',
  });

  const outputs = Object.values(result.metafile.outputs);
  const output = outputs[0];
  if (!output?.exports) {
    return [];
  }

  return output.exports;
}

async function collectRuntimeKeys(specifier: string, fallbackEntry: string): Promise<RuntimeKeysResult> {
  const importResult = await loadImportKeys(specifier);
  const requireResult = loadRequireKeys(specifier);

  const runtimeKeys = normalizeKeys([...importResult.keys, ...requireResult.keys]);
  if (runtimeKeys.length > 0) {
    return {
      keys: runtimeKeys,
      importError: importResult.error,
      requireError: requireResult.error,
      source: 'runtime',
    };
  }

  const staticKeys = normalizeKeys(await loadStaticEsbuildExports(fallbackEntry));

  return {
    keys: staticKeys,
    importError: importResult.error,
    requireError: requireResult.error,
    source: 'runtime+static-fallback',
  };
}

function fail(message: string): never {
  console.error(`[export-parity] ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const lockfilePath = path.resolve(packageRoot, 'bun.lock');
  if (!fs.existsSync(lockfilePath)) {
    fail('Missing bun.lock; lockfile-resolved baseline is required.');
  }

  const upstreamPackageJsonPath = require.resolve('react-native-reanimated-dnd/package.json');
  const upstreamPackageJson = JSON.parse(fs.readFileSync(upstreamPackageJsonPath, 'utf8')) as {
    version?: string;
  };

  const upstreamVersion = upstreamPackageJson.version ?? 'unknown';
  const upstreamSpecifier = 'react-native-reanimated-dnd';
  const webSpecifier = pathToFileURL(path.resolve(packageRoot, 'src/index.web.tsx')).href;

  const upstreamFallbackEntry = path.resolve(
    packageRoot,
    'node_modules/react-native-reanimated-dnd/lib/index.js',
  );
  const webFallbackEntry = path.resolve(packageRoot, 'src/index.web.tsx');

  const upstream = await collectRuntimeKeys(upstreamSpecifier, upstreamFallbackEntry);
  const web = await collectRuntimeKeys(webSpecifier, webFallbackEntry);

  const missingFromWeb = setDiff(upstream.keys, web.keys);
  const extraOnWeb = setDiff(web.keys, upstream.keys);

  const allowlistedExtras = normalizeKeys(exportParityConfig.extraWebExports);
  const allowlistedOmissions = normalizeKeys(exportParityConfig.omittedWebExports);

  const allowlistedExtrasUsed = extraOnWeb.filter((item) => allowlistedExtras.includes(item));
  const allowlistedOmissionsUsed = missingFromWeb.filter((item) => allowlistedOmissions.includes(item));

  const unapprovedExtraOnWeb = extraOnWeb.filter((item) => !allowlistedExtras.includes(item));
  const unapprovedMissingFromWeb = missingFromWeb.filter(
    (item) => !allowlistedOmissions.includes(item),
  );

  console.log(
    JSON.stringify(
      {
        baseline: {
          upstreamPackage: 'react-native-reanimated-dnd',
          upstreamVersion,
          lockfile: 'bun.lock',
          lockfilePath,
          upstreamSource: upstream.source,
          webSource: web.source,
        },
        diff: {
          missingFromWeb,
          extraOnWeb,
          allowlistedExtrasUsed,
          allowlistedOmissionsUsed,
        },
        diagnostics: {
          upstreamImportError: upstream.importError ?? null,
          upstreamRequireError: upstream.requireError ?? null,
          webImportError: web.importError ?? null,
          webRequireError: web.requireError ?? null,
        },
      },
      null,
      2,
    ),
  );

  if (unapprovedExtraOnWeb.length > 0 || unapprovedMissingFromWeb.length > 0) {
    fail(
      `Export parity mismatch. unapprovedMissingFromWeb=${JSON.stringify(
        unapprovedMissingFromWeb,
      )} unapprovedExtraOnWeb=${JSON.stringify(unapprovedExtraOnWeb)}`,
    );
  }
}

await main();
