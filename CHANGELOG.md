# Changelog

## 0.1.0

- Added split entrypoints: `index.native` and `index.web`.
- Native entry now re-exports upstream `react-native-reanimated-dnd`.
- Web entry mirrors upstream export names, implements sortable components, and stubs unsupported symbols.
- Covered by shared contract tests for export-surface parity and web import/runtime stub behavior in `@ankh/dnd`.
