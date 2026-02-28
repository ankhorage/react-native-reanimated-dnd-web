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
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-web": "^0.21.2"
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
    "next": "16.0.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-web": "^0.21.2"
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
  NEXT_TELEMETRY_DISABLED=1 npm run build
}

write_expo_files() {
  cat > "${APP_DIR}/package.json" <<EOF
{
  "name": "dnd-expo-consumer",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "export:web": "expo export --platform web --non-interactive",
    "export:android": "expo export --platform android --non-interactive"
  },
  "dependencies": {
    "${PACKAGE_NAME}": "file:${TARBALL_ABS}",
    "expo": "~54.0.33",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-web": "^0.21.2"
  },
  "devDependencies": {
    "@babel/core": "^7.28.4"
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

  cat > "${APP_DIR}/babel.config.js" <<'EOF'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
EOF

  cat > "${APP_DIR}/App.js" <<'EOF'
import React from 'react';
import { Text, View } from 'react-native';
import { clamp, DropProvider, Sortable, SortableItem } from '@ankhorage/react-native-reanimated-dnd-web';

const data = [{ id: 'a', label: 'Alpha' }];

export default function App() {
  return (
    <DropProvider>
      <View style={{ padding: 24 }}>
        <Text>{`Clamp: ${clamp(8, 0, 2)}`}</Text>
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
    </DropProvider>
  );
}
EOF
}

run_expo_consumer() {
  local platform="$1"
  mkdir -p "${APP_DIR}"
  write_expo_files

  cd "${APP_DIR}"
  run_npm_install
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
