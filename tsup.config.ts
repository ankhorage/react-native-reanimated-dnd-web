import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index.native': 'src/index.native.ts',
      'index.web': 'src/index.web.tsx',
      'sortableCompat.web': 'src/sortableCompat.web.tsx',
      'web/domMeasurement': 'src/web/domMeasurement.ts',
      'web/geometry': 'src/web/geometry.ts',
      'web/sortable': 'src/web/sortable.tsx',
      'web/DropProvider.web': 'src/web/DropProvider.web.tsx',
      'web/Droppable.web': 'src/web/Droppable.web.tsx',
      'web/useDroppable.web': 'src/web/useDroppable.web.ts',
      'web/Draggable.web': 'src/web/Draggable.web.tsx',
      'web/useDraggable.web': 'src/web/useDraggable.web.ts',
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
