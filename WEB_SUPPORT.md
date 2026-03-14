# Web Support Matrix

This matrix defines web support status for `@ankhorage/react-native-reanimated-dnd-web`.

## Evidence Policy

- `Supported`: requires a demo route and Playwright coverage in Chromium + WebKit.
- `Experimental`: available but missing complete coverage and/or reliability guarantees.
- `Unsupported`: intentionally not provided. Must include a reason and path forward.

## Demo Routes

- `examples` route: `/demos/draggable-basic`
- `examples` route: `/demos/draggable-dropzones`
- `examples` route: `/demos/sortable-vertical`
- `examples` route: `/demos/sortable-horizontal`

## Current Matrix

| Symbol | Status | Evidence |
| --- | --- | --- |
| `Sortable` | Supported | `tests/e2e/sortable.spec.ts` (vertical + horizontal) |
| `SortableItem` | Supported | `tests/e2e/sortable.spec.ts` (including `SortableItem.Handle`) |
| `useSortableList` | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet |
| `useSortable` | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet |
| `DropProvider` | Supported | `tests/e2e/draggable.spec.ts` (`/demos/draggable-basic`, `/demos/draggable-dropzones`) |
| `Draggable` | Supported | `tests/e2e/draggable.spec.ts` (free drag, handle-only drag, repeat drop overwrite, disabled drag) |
| `Droppable` | Supported | `tests/e2e/draggable.spec.ts` (eligible targets, overlapping targets, disabled targets) |
| `useDraggable` | Experimental | Web compatibility implementation; no dedicated hook-level web reliability suite yet |
| `useDroppable` | Experimental | Web compatibility implementation; no dedicated hook-level web reliability suite yet |
| `clamp`, `listToObject`, `objectMove`, `setPosition`, `setAutoScroll` | Experimental | Web compatibility utility implementation; no dedicated utility contract tests yet |

## Upstream Parity Notes

- Export parity is checked by `scripts/check-export-parity.ts`.
- Baseline is the installed upstream version resolved by `bun.lock`.
- Any intentional extra/omitted exports must be allowlisted in `tests/export-parity.config.ts`.

## Sortable Risk Coverage

Covered by Playwright:

- reorder commit behavior (vertical/horizontal)
- deterministic final order
- pointer leave + return path
- settle checks (`200ms` stable window, `500ms` maximum settle time)
- drag callback payload assertions
- browser console warning/error assertions

## Drag/Drop Risk Coverage

Covered by Playwright:

- free drag reset on miss
- overlapping target resolution
- handle-only dragging
- dropped-items overwrite by `draggableId`
- `dragDisabled` and `dropDisabled` behavior
- browser console warning/error assertions

Not fully covered yet:

- scroll container offset edge cases
- transformed/scaled parent edge cases
- nested pressable interactions
- pointer cancel/capture edge cases
- text selection edge cases
- RTL behavior

If a risk case cannot be made reliable, it must be downgraded to `Experimental` or `Unsupported` here with:

- reproduction steps
- failing test path/link
