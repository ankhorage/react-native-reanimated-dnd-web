# Changelog

## 0.4.0

### Minor Changes

- 0f20818: Validate and support the Expo SDK 57 animation stack. Native now passes through
  `react-native-reanimated-dnd` 2.0, the public native peer contract includes Worklets, and the web
  adapter supports the upstream v2 draggable and horizontal-sortable contract while explicitly
  classifying grid APIs as native-only.

## 0.3.2

### Patch Changes

- f586a7d: Add @ankhorage/devtools with: eslint, prettier, knip

## 0.3.1

- Refresh the published README with a concise overview, installation, usage, and cross-platform use cases.

## 0.3.0

- Added web compatibility implementations for `DropProvider`, `Droppable`, and `Draggable` with upstream-compatible `onDrop(data)` and `getDroppedItems()` semantics.
- Added deterministic web drag/drop behavior for handle-only dragging, bounds and axis constraints, overlapping target resolution, disabled-state handling, and dropped-item overwrite by `draggableId`.
- Split the web compatibility runtime into focused `src/web/*` modules while keeping sortable behavior intact.
- Added draggable demo routes under `examples/` and Playwright coverage for Chromium and WebKit.
- Expanded Expo consumer smoke coverage and updated `README.md` and `WEB_SUPPORT.md` for supported web drag/drop behavior.
- Ensured non-bundled builds emit the internal `dist/web/*` modules required by the web entry.

## 0.2.0

- Switched web entry to upstream export passthrough with sortable-only compatibility overrides.
- Replaced static upstream web runtime re-export with a parity-compatible compatibility layer to avoid bundler parse failures in Vite/Next consumer builds.
- Removed web throw-stub behavior for non-sortable symbols; symbols now use compatibility implementations on web.
- Added lockfile-resolved upstream export parity checker (`scripts/check-export-parity.ts`) and allowlist config (`tests/export-parity.config.ts`).
- Added sortable demo routes under `examples/` and Playwright E2E coverage for Chromium and WebKit.
- Added `WEB_SUPPORT.md` with evidence-based support levels and sortable risk coverage notes.
- Added CI web E2E jobs (`chromium`, `webkit`) and parity check in release validation.

## 0.1.2

- Declared stable adapter contract for `0.1.x`: native passthrough + scoped web support.
- Added split entrypoints (`index.native`, `index.web`) with platform-aware package fields.
- Native entry re-exports upstream `react-native-reanimated-dnd` API.
- Web entry supports sortable flows (`DropProvider`, `Sortable`, `SortableItem`) plus utility parity helpers.
- Unsupported web symbols (`Draggable`, `Droppable`, `useDraggable`, `useDroppable`, `useSortable`, `useSortableList`) are import-safe and throw only when invoked/rendered.
- Added standalone package tests for utility behavior and unsupported-symbol invocation errors.
- Added CI consumer matrix coverage for `vite`, `next`, `expo-web`, and `expo-native`.
