# @ankhorage/react-native-reanimated-dnd-web

[![CI](https://github.com/ankhorage/react-native-reanimated-dnd-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ankhorage/react-native-reanimated-dnd-web/actions/workflows/ci.yml)

Platform adapter for `react-native-reanimated-dnd`:

- native: passthrough re-export of upstream package
- web: sortable-list support + explicit stubs for unsupported symbols

This is an integration-focused adapter with scoped compatibility, not full upstream parity yet.

## Install

```bash
npm install @ankhorage/react-native-reanimated-dnd-web react react-native react-native-reanimated-dnd
```

## Import

Use the same import on native and web:

```ts
import { DropProvider, Sortable, SortableItem, clamp } from '@ankhorage/react-native-reanimated-dnd-web';
```

The package resolves to:

- `dist/index.native.js` via `react-native`
- `dist/index.web.js` via `main`/`browser`

## Compatibility Scope

| Export | Web status | Notes |
| --- | --- | --- |
| `DropProvider` | Supported | No-op provider wrapper. |
| `Sortable` | Supported | Sortable list container. |
| `SortableItem` | Supported | Includes `SortableItem.Handle`. |
| `clamp` | Supported | Utility parity helper. |
| `objectMove` | Supported | Utility parity helper. |
| `listToObject` | Supported | Utility parity helper. |
| `setPosition` | Supported | Utility parity helper. |
| `setAutoScroll` | Supported | Utility parity helper. |
| `ScrollDirection` | Supported | Utility enum parity helper. |
| `Draggable` | Unsupported | Import-safe; throws when invoked/rendered. |
| `Droppable` | Unsupported | Import-safe; throws when invoked/rendered. |
| `useDraggable` | Unsupported | Import-safe; throws when invoked. |
| `useDroppable` | Unsupported | Import-safe; throws when invoked. |
| `useSortable` | Unsupported | Import-safe; throws when invoked. |
| `useSortableList` | Unsupported | Import-safe; throws when invoked. |

`Unsupported` means:

- importing the symbol is safe
- runtime error is thrown only when that symbol is actually invoked/rendered on web

## CI Matrix

`ci.yml` validates:

- package checks: build, tests, metadata/version sync, pack smoke
- consumer integrations: `vite`, `next`, `expo-web`, `expo-native`

Run locally with:

```bash
bun run build
bun run test
npm pack --pack-destination .artifacts .
bun run consumer:matrix vite .artifacts/*.tgz
```
