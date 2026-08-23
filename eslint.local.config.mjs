import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '@ankhorage/devtools/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default [
  ...createConfig({
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
    files: ['examples/**/*.{ts,tsx}'],
  }),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // This package owns the web boundary and native passthrough, so the upstream import is intentional.
      'no-restricted-imports': 'off',
    },
  },
  {
    files: [
      'examples/src/draggable-harness.tsx',
      'examples/src/sortable-demo.tsx',
      'src/web/DropProvider.web.test.tsx',
      'src/web/DropProvider.web.tsx',
      'src/web/geometry.test.ts',
      'src/web/sortable.tsx',
      'src/web/useDraggable.web.ts',
      'src/web/useDroppable.web.ts',
    ],
    rules: {
      // These interaction harnesses and state-machine adapters are intentionally cohesive.
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['examples/src/draggable-harness.tsx'],
    rules: {
      // Upstream's dragBoundsRef declaration excludes the ref's pre-mount null state.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['src/web/DropProvider.web.tsx', 'src/web/geometry.ts', 'src/web/sortable.tsx'],
    rules: {
      // IDs index package-owned in-memory drag/drop registries, not object prototypes or inputs.
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['src/web/sortable.tsx'],
    rules: {
      // The web shim intentionally models Reanimated SharedValue objects with a mutable `value` field.
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
];
