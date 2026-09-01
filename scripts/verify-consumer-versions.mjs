import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function satisfiesDeclaredVersionRange(declaredRange, installedVersion) {
  if (!declaredRange.startsWith('~')) return declaredRange === installedVersion;

  const minimum = parseVersion(declaredRange.slice(1));
  const installed = parseVersion(installedVersion);
  return (
    minimum !== null &&
    installed !== null &&
    installed.major === minimum.major &&
    installed.minor === minimum.minor &&
    installed.patch >= minimum.patch
  );
}

export function resolveDeclaredVersionRange(
  consumerPackageJson,
  candidatePackageJson,
  packageName,
) {
  return (
    consumerPackageJson.dependencies?.[packageName] ??
    candidatePackageJson.dependencies?.[packageName]
  );
}

function verifyConsumerVersions(consumerRoot, candidatePackageName, packageNames) {
  const packageJson = readJson(path.join(consumerRoot, 'package.json'));
  const candidatePackageJson = readJson(
    path.join(consumerRoot, 'node_modules', candidatePackageName, 'package.json'),
  );
  const verified = {};

  for (const packageName of packageNames) {
    const declaredRange = resolveDeclaredVersionRange(
      packageJson,
      candidatePackageJson,
      packageName,
    );
    if (typeof declaredRange !== 'string') {
      throw new Error(`${packageName}: missing consumer dependency declaration`);
    }
    const installedVersion = readJson(
      path.join(consumerRoot, 'node_modules', packageName, 'package.json'),
    ).version;
    if (typeof installedVersion !== 'string') {
      throw new Error(`${packageName}: installed package has no version`);
    }
    if (!satisfiesDeclaredVersionRange(declaredRange, installedVersion)) {
      throw new Error(
        `${packageName}: installed ${installedVersion} does not satisfy declared ${declaredRange}`,
      );
    }
    verified[packageName] = { declaredRange, installedVersion };
  }

  return verified;
}

function parseVersion(version) {
  const match = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/.exec(version);
  if (match?.groups === undefined) return null;
  return {
    major: Number(match.groups.major),
    minor: Number(match.groups.minor),
    patch: Number(match.groups.patch),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [consumerRoot, candidatePackageName, ...packageNames] = process.argv.slice(2);
  if (
    consumerRoot === undefined ||
    candidatePackageName === undefined ||
    packageNames.length === 0
  ) {
    throw new Error(
      'Usage: verify-consumer-versions.mjs <consumer-root> <candidate-package> <package>...',
    );
  }
  const verified = verifyConsumerVersions(consumerRoot, candidatePackageName, packageNames);
  console.log(`[consumer-matrix] verified declared dependency ranges ${JSON.stringify(verified)}`);
}
