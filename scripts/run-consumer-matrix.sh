#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
TARBALL_PATH="${2:-}"
PACKAGE_NAME="@ankhorage/react-native-reanimated-dnd-web"

if [[ -z "${TARGET}" || -z "${TARBALL_PATH}" ]]; then
  echo "Usage: ./scripts/run-consumer-matrix.sh <expo-web|expo-native|vite|next> <path-to-tgz>"
  exit 1
fi

if [[ ! -f "${TARBALL_PATH}" ]]; then
  echo "Tarball not found: ${TARBALL_PATH}"
  exit 1
fi

TARBALL_ABS="$(cd "$(dirname "${TARBALL_PATH}")" && pwd)/$(basename "${TARBALL_PATH}")"
WORKDIR="$(mktemp -d)"
APP_DIR="${WORKDIR}/consumer"

cleanup() {
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

run_npm_install() {
  local npm_cache="${NPM_CONFIG_CACHE:-${WORKDIR}/.npm-cache}"
  NPM_CONFIG_CACHE="${npm_cache}" npm install --no-audit --no-fund
}

verify_candidate_install() {
  node --input-type=module - "${TARBALL_ABS}" "${PACKAGE_NAME}" <<'EOF'
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [tarball, packageName] = process.argv.slice(2);
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lockfile = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const installed = JSON.parse(
  fs.readFileSync(path.join('node_modules', packageName, 'package.json'), 'utf8'),
);
const packed = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }));
const lockEntry = lockfile.packages?.[`node_modules/${packageName}`];

if (packageJson.dependencies?.[packageName] !== `file:${tarball}`) {
  throw new Error(`Consumer does not depend on the candidate tarball: ${tarball}`);
}
if (!lockEntry?.resolved?.endsWith(path.basename(tarball))) {
  throw new Error(`Lockfile does not resolve ${packageName} from ${path.basename(tarball)}`);
}
if (installed.name !== packageName || installed.version !== packed.version) {
  throw new Error(`Installed candidate metadata mismatch for ${packageName}`);
}
console.log(`[consumer-matrix] verified packed candidate ${installed.name}@${installed.version}`);
EOF
}

assert_no_manual_worklets_config() {
  local plugin_pattern='react-native-(reanimated|worklets)/'"plugin"
  local bundle_pattern='bundle'"Mode"'|bundle-'"mode"
  if find "${APP_DIR}" -path '*/node_modules' -prune -o -type f -print0 \
    | xargs -0 grep -El "${plugin_pattern}|${bundle_pattern}" >/dev/null; then
    echo "Expo fixture must use Expo's default Reanimated/Worklets transform without bundle mode."
    exit 1
  fi

  if [[ -e "${APP_DIR}/babel.config.js" || -e "${APP_DIR}/babel.config.cjs" || -e "${APP_DIR}/babel.config.mjs" ]]; then
    echo "Expo fixture must not carry a custom Babel config."
    exit 1
  fi
}

verify_expo_versions() {
  node --input-type=module <<'EOF'
import fs from 'node:fs';

const expected = {
  expo: '57.0.15',
  react: '19.2.3',
  'react-dom': '19.2.3',
  'react-native': '0.86.2',
  'react-native-gesture-handler': '2.32.0',
  'react-native-reanimated': '4.5.1',
  'react-native-reanimated-dnd': '2.0.0',
  'react-native-web': '0.21.2',
  'react-native-worklets': '0.10.1',
};

for (const [name, version] of Object.entries(expected)) {
  const installed = JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`, 'utf8')).version;
  if (installed !== version) throw new Error(`${name}: expected ${version}, received ${installed}`);
}
console.log(`[consumer-matrix] verified Expo SDK 57 animation stack ${JSON.stringify(expected)}`);
EOF
}

run_vite_consumer() {
  mkdir -p "${APP_DIR}/src"

  cat > "${APP_DIR}/package.json" <<EOF
{
  "name": "dnd-vite-consumer",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "${PACKAGE_NAME}": "file:${TARBALL_ABS}",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.2",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.10.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",
    "vite": "^7.1.7"
  }
}
EOF

  cat > "${APP_DIR}/vite.config.mjs" <<'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
  },
});
EOF

  cat > "${APP_DIR}/index.html" <<'EOF'
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>dnd-vite-consumer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

  cat > "${APP_DIR}/src/main.jsx" <<'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Text, View } from 'react-native';
import { clamp, DropProvider, Sortable, SortableItem } from '@ankhorage/react-native-reanimated-dnd-web';

const data = [{ id: 'a', label: 'Alpha' }];

function App() {
  return (
    <DropProvider>
      <View>
        <Text>{`Clamp: ${clamp(9, 0, 2)}`}</Text>
        <Sortable
          data={data}
          itemHeight={44}
          itemKeyExtractor={(item) => item.id}
          renderItem={({ item, id, positions, itemsCount, autoScrollDirection, lowerBound }) => (
            <SortableItem
              id={id}
              data={item}
              positions={positions}
              itemsCount={itemsCount}
              itemHeight={44}
              lowerBound={lowerBound}
              autoScrollDirection={autoScrollDirection}
            >
              <View>
                <Text>{item.label}</Text>
              </View>
            </SortableItem>
          )}
        />
      </View>
    </DropProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
EOF

  cd "${APP_DIR}"
  run_npm_install
  verify_candidate_install
  npm run build
}

run_next_consumer() {
  mkdir -p "${APP_DIR}/app"

  cat > "${APP_DIR}/package.json" <<EOF
{
  "name": "dnd-next-consumer",
  "private": true,
  "scripts": {
    "build": "next build --webpack"
  },
  "dependencies": {
    "${PACKAGE_NAME}": "file:${TARBALL_ABS}",
    "next": "16.3.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.2",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.10.1"
  }
}
EOF

  cat > "${APP_DIR}/next.config.mjs" <<'EOF'
const nextConfig = {
  transpilePackages: ['@ankhorage/react-native-reanimated-dnd-web'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
    };
    return config;
  },
};

export default nextConfig;
EOF

  cat > "${APP_DIR}/app/layout.jsx" <<'EOF'
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

  cat > "${APP_DIR}/app/page.jsx" <<'EOF'
'use client';

import { clamp, DropProvider, Sortable, SortableItem } from '@ankhorage/react-native-reanimated-dnd-web';
import { Text, View } from 'react-native';

const data = [{ id: 'a', label: 'Alpha' }];

export default function Page() {
  return (
    <DropProvider>
      <View>
        <Text>{`Clamp: ${clamp(4, 0, 3)}`}</Text>
        <Sortable
          data={data}
          itemHeight={44}
          itemKeyExtractor={(item) => item.id}
          renderItem={({ item, id, positions, itemsCount, autoScrollDirection, lowerBound }) => (
            <SortableItem
              id={id}
              data={item}
              positions={positions}
              itemsCount={itemsCount}
              itemHeight={44}
              lowerBound={lowerBound}
              autoScrollDirection={autoScrollDirection}
            >
              <View>
                <Text>{item.label}</Text>
              </View>
            </SortableItem>
          )}
        />
      </View>
    </DropProvider>
  );
}
EOF

  cd "${APP_DIR}"
  run_npm_install
  verify_candidate_install
  NEXT_TELEMETRY_DISABLED=1 npm run build
}

write_expo_files() {
  cat > "${APP_DIR}/package.json" <<EOF
{
  "name": "dnd-expo-consumer",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "export:web": "expo export --platform web",
    "export:android": "expo export --platform android"
  },
  "dependencies": {
    "${PACKAGE_NAME}": "file:${TARBALL_ABS}",
    "expo": "~57.0.15",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.2",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.10.1"
  }
}
EOF

  cat > "${APP_DIR}/app.json" <<'EOF'
{
  "expo": {
    "name": "dnd-expo-consumer",
    "slug": "dnd-expo-consumer",
    "platforms": ["android", "web"]
  }
}
EOF

  cat > "${APP_DIR}/App.js" <<'EOF'
import React from 'react';
import { Text, View } from 'react-native';
import {
  clamp,
  Draggable,
  Droppable,
  DropProvider,
  Sortable,
  SortableItem,
} from '@ankhorage/react-native-reanimated-dnd-web';

const data = [{ id: 'a', label: 'Alpha' }];

export default function App() {
  return (
    <DropProvider>
      <View style={{ padding: 24 }}>
        <Text>{`Clamp: ${clamp(8, 0, 2)}`}</Text>
        <View style={{ marginBottom: 24 }}>
          <Sortable
            data={data}
            itemHeight={44}
            itemKeyExtractor={(item) => item.id}
            renderItem={({ item, id, positions, itemsCount, autoScrollDirection, lowerBound }) => (
              <SortableItem
                id={id}
                data={item}
                positions={positions}
                itemsCount={itemsCount}
                itemHeight={44}
                lowerBound={lowerBound}
                autoScrollDirection={autoScrollDirection}
              >
                <View style={{ height: 44, justifyContent: 'center' }}>
                  <Text>{item.label}</Text>
                </View>
              </SortableItem>
            )}
          />
        </View>
        <View style={{ marginBottom: 12 }}>
          <Droppable
            droppableId="zone-a"
            capacity={2}
            onDrop={() => undefined}
            style={{
              height: 72,
              borderWidth: 1,
              borderColor: '#64748b',
              borderRadius: 12,
              justifyContent: 'center',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
            activeStyle={{ backgroundColor: '#dcfce7', borderColor: '#16a34a' }}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text>Drop Zone</Text>
            </View>
          </Droppable>
          <Draggable draggableId="drag-a" data={{ id: 'drag-a', label: 'Drag Me' }}>
            <View
              style={{
                width: 160,
                height: 56,
                borderWidth: 1,
                borderColor: '#94a3b8',
                borderRadius: 12,
                justifyContent: 'center',
                paddingHorizontal: 16,
              }}
            >
              <Text>Drag Me</Text>
            </View>
          </Draggable>
        </View>
      </View>
    </DropProvider>
  );
}
EOF
}

run_expo_consumer() {
  local platform="$1"
  mkdir -p "${APP_DIR}"
  write_expo_files
  assert_no_manual_worklets_config

  cd "${APP_DIR}"
  run_npm_install
  verify_candidate_install
  verify_expo_versions
  assert_no_manual_worklets_config
  EXPO_NO_TELEMETRY=1 CI=1 npm run "export:${platform}"
}

case "${TARGET}" in
  vite)
    run_vite_consumer
    ;;
  next)
    run_next_consumer
    ;;
  expo-web)
    run_expo_consumer web
    ;;
  expo-native)
    run_expo_consumer android
    ;;
  *)
    echo "Unknown target: ${TARGET}"
    exit 1
    ;;
esac

echo "[consumer-matrix] ${TARGET} passed"
