# Web Support Matrix

This matrix defines web support status for `@ankhorage/react-native-reanimated-dnd-web`.

The current validated platform is Expo SDK 57 with React Native 0.86.2, React Native Web
0.21.2, Gesture Handler 2.32.0, Reanimated 4.5.1, and Worklets 0.10.1. Expo's default Babel
configuration owns Reanimated/Worklets transformation; no explicit plugin or Worklets bundle
mode is used.

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

| Symbol                                                                | Status       | Evidence                                                                                          |
| --------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `Sortable`                                                            | Supported    | `tests/e2e/sortable.spec.ts` (vertical + horizontal)                                              |
| `SortableItem`                                                        | Supported    | `tests/e2e/sortable.spec.ts` (including `SortableItem.Handle`)                                    |
| `useSortableList`                                                     | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet                 |
| `useSortable`                                                         | Experimental | Runtime parity + unit export checks; no direct Playwright hook-level contract yet                 |
| `useHorizontalSortableList`                                           | Experimental | Web compatibility implementation over the supported horizontal sortable behavior                  |
| `useHorizontalSortable`                                               | Experimental | Web compatibility implementation over the supported horizontal sortable behavior                  |
| `DropProvider`                                                        | Supported    | `tests/e2e/draggable.spec.ts` (`/demos/draggable-basic`, `/demos/draggable-dropzones`)            |
| `Draggable`                                                           | Supported    | `tests/e2e/draggable.spec.ts` (free drag, handle-only drag, repeat drop overwrite, disabled drag) |
| `Droppable`                                                           | Supported    | `tests/e2e/draggable.spec.ts` (eligible targets, overlapping targets, disabled targets)           |
| `useDraggable`                                                        | Experimental | Web compatibility implementation; no dedicated hook-level web reliability suite yet               |
| `useDroppable`                                                        | Experimental | Web compatibility implementation; no dedicated hook-level web reliability suite yet               |
| `clamp`, `listToObject`, `objectMove`, `setPosition`, `setAutoScroll` | Experimental | Web compatibility utility implementation; no dedicated utility contract tests yet                 |

## Upstream Parity Notes

- Export parity is checked by `scripts/check-export-parity.ts`.
- Baseline is the installed upstream version resolved by `bun.lock`.
- Any intentional extra/omitted exports must be allowlisted in `tests/export-parity.config.ts`.
- Native remains a direct `export *` passthrough to `react-native-reanimated-dnd` 2.0.
- Upstream v2 grid components, hooks, enums, and grid calculation helpers are intentionally
  `Unsupported` on web in this release. They remain available from the native entrypoint. Adding
  web grid support requires owned interaction behavior and browser tests, not export stubs.
- Upstream v2 dynamic-height sortable mode is `Unsupported` on web and fails with an explicit
  error. Fixed-height vertical and horizontal sorting remain supported.

## React Native 0.82–0.86 audit

| Area                            | Result                       | Evidence / action                                                                                           |
| ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Fabric / New Architecture       | VERIFIED: NO CHANGE REQUIRED | Native is upstream v2 passthrough; the web adapter does not access Fabric internals.                        |
| Layout / measurement            | VERIFIED: NO CHANGE REQUIRED | Native measurement is upstream-owned; web uses guarded DOM measurement and existing interaction E2E.        |
| Refs                            | CHANGE REQUIRED              | RN 0.86 / React 19.2 ref types are compiled under strict TS 6; demo and adapter ref typing was updated.     |
| Pointer / touch events          | VERIFIED: NO CHANGE REQUIRED | Native gestures remain upstream-owned; web pointer interactions run in Chromium and WebKit.                 |
| Gesture Handler integration     | CHANGE REQUIRED              | Upstream v2 replaces the removed legacy gesture-handler hook path and requires Gesture Handler 2.28+.       |
| Reanimated / Worklets semantics | CHANGE REQUIRED              | Upstream v2 uses Reanimated 4 and Worklets scheduling; the public peer contract now reflects both runtimes. |
| Scheduler / frames              | VERIFIED: NO CHANGE REQUIRED | No wrapper scheduler/frame code exists; native scheduling is upstream-owned and web remains event-driven.   |
| Native vs web behavior          | CHANGE REQUIRED              | v2 handle registration, pre-drag delay, horizontal hooks, and explicit grid omissions were reconciled.      |
| Metro / module resolution       | VERIFIED: NO CHANGE REQUIRED | Expo native export validates the packed native entry; web exports validate the packed browser entry.        |
| TypeScript types                | CHANGE REQUIRED              | TS 6 and RN 0.86 exposed enum, style, generic, gesture, ref, and sortable return-shape changes now fixed.   |

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
