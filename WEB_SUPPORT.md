# Web Support Matrix

This matrix defines web support status for `@ankhorage/react-native-reanimated-dnd-web`.

## Evidence Policy

- `Supported`: requires a demo route and Playwright coverage in Chromium + WebKit.
- `Experimental`: available but missing complete coverage and/or reliability guarantees.
- `Unsupported`: intentionally not provided. Must include a reason and path forward.

## Demo Routes

- `examples` route: `/demos/sortable-vertical`
- `examples` route: `/demos/sortable-horizontal`

## Current Matrix

| Symbol | Status | Evidence |
| --- | --- | --- |
| `Sortable` | Supported | `tests/e2e/sortable.spec.ts` (vertical + horizontal) |
| `SortableItem` | Supported | `tests/e2e/sortable.spec.ts` (including `SortableItem.Handle`) |
| `useSortableList` | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet |
| `useSortable` | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet |
| `DropProvider` | Experimental | Available through upstream passthrough; no dedicated web reliability suite yet |
| `Draggable` | Experimental | Available through upstream passthrough; no dedicated web reliability suite yet |
| `Droppable` | Experimental | Available through upstream passthrough; no dedicated web reliability suite yet |
| `useDraggable` | Experimental | Available through upstream passthrough; no dedicated web reliability suite yet |
| `useDroppable` | Experimental | Available through upstream passthrough; no dedicated web reliability suite yet |
| `clamp`, `listToObject`, `objectMove`, `setPosition`, `setAutoScroll` | Experimental | Exposed via upstream passthrough; no dedicated web utility contract tests yet |

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
