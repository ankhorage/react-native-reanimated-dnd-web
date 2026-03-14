# @ankhorage/react-native-reanimated-dnd-web

[![CI](https://github.com/ankhorage/react-native-reanimated-dnd-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ankhorage/react-native-reanimated-dnd-web/actions/workflows/ci.yml)

Platform adapter for `react-native-reanimated-dnd`:

- native: passthrough re-export of upstream package
- web: parity-compatible export surface implemented by a web compatibility layer

The package keeps `@ankhorage/react-native-reanimated-dnd-web` as a stable import path while preserving upstream API shape and adding deterministic sortable and drag/drop behavior on web.

## Install

```bash
npm install @ankhorage/react-native-reanimated-dnd-web react react-native react-native-reanimated-dnd
```

## Import

Use the same import on native and web:

```ts
import {
  Draggable,
  Droppable,
  DropProvider,
  Sortable,
  SortableItem,
  clamp,
} from '@ankhorage/react-native-reanimated-dnd-web';
```

The package resolves to:

- `dist/index.native.js` via `react-native`
- `dist/index.web.js` via `main`/`browser`

## Compatibility Scope

Support levels are documented in [`WEB_SUPPORT.md`](./WEB_SUPPORT.md) with evidence links.

Status policy:

- `Supported` requires a demo route plus Playwright coverage in Chromium and WebKit.
- `Experimental` or `Unsupported` must include a documented reason and evidence.

## Upstream Parity Contract

The web entry is contract-checked against installed upstream `react-native-reanimated-dnd`:

- export keys are normalized and compared (deduped + sorted)
- diff output is structured as:
  - `missingFromWeb`
  - `extraOnWeb`
  - `allowlistedExtrasUsed`
  - `allowlistedOmissionsUsed`
- baseline is lockfile-resolved (`bun.lock` at the checked commit)

Run locally:

```bash
bun run check:parity
bun run build
bun run test
bun run test:e2e --project=chromium
bun run test:e2e --project=webkit
npm pack --pack-destination .artifacts .
bun run consumer:matrix vite .artifacts/*.tgz
```

## Web Reliability Focus

Web reliability coverage currently includes:

- vertical and horizontal reorder behavior
- free drag with reset on miss
- overlapping drop-zone resolution
- handle-only dragging
- `dragDisabled` and `dropDisabled` behavior
- deterministic final ordering for same drag path
- pointer-leave resilience
- settle checks after drop

Demo routes live in `examples/`:

- `/demos/draggable-basic`
- `/demos/draggable-dropzones`
- `/demos/sortable-vertical`
- `/demos/sortable-horizontal`

All web demos and Playwright specs are designed to run headless in CI without manual steps, device prompts, or secure-context assumptions beyond localhost.
