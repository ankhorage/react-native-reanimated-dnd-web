import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index.native': 'src/index.native.ts',
      'index.web': 'src/index.web.tsx',
    },
    format: ['esm'],
    target: 'es2022',
    platform: 'neutral',
    sourcemap: true,
    clean: true,
    bundle: false,
    dts: false,
  },
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    target: 'es2022',
    platform: 'neutral',
    sourcemap: false,
    clean: false,
    bundle: false,
    dts: {
      only: true,
    },
  },
]);
