# Changelog

## 0.1.2

- Declared stable adapter contract for `0.1.x`: native passthrough + scoped web support.
- Added split entrypoints (`index.native`, `index.web`) with platform-aware package fields.
- Native entry re-exports upstream `react-native-reanimated-dnd` API.
- Web entry supports sortable flows (`DropProvider`, `Sortable`, `SortableItem`) plus utility parity helpers.
- Unsupported web symbols (`Draggable`, `Droppable`, `useDraggable`, `useDroppable`, `useSortable`, `useSortableList`) are import-safe and throw only when invoked/rendered.
- Added standalone package tests for utility behavior and unsupported-symbol invocation errors.
- Added CI consumer matrix coverage for `vite`, `next`, `expo-web`, and `expo-native`.
