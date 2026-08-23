# react-native-reanimated-dnd-web

Cross-platform compatibility package for `react-native-reanimated-dnd`.

- Native imports are passed through to the upstream package.
- Web imports resolve to this package's React Native Web pointer-event adapter.
- Expo SDK 57 works with Expo's default Babel configuration; no explicit Reanimated or Worklets plugin is needed.

## Install

For Expo SDK 57, install the package and Expo-supported animation stack:

```bash
bunx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
bun add @ankhorage/react-native-reanimated-dnd-web
```

The validated SDK 57 matrix is Expo 57.0.15, React 19.2.3, React Native 0.86.2,
React Native Web 0.21.2, Gesture Handler 2.32.0, Reanimated 4.5.1, and Worklets 0.10.1.
Do not add an explicit Reanimated or Worklets transform plugin to an Expo 57 Babel config. This
package does not require Worklets bundle mode.

## Usage

```tsx
import { Draggable, Droppable, DropProvider } from '@ankhorage/react-native-reanimated-dnd-web';

export function DragAndDrop() {
  return (
    <DropProvider>
      <Droppable onDrop={(item) => console.log(item)}>
        <Draggable data={{ id: 'item-1' }}>{/* React Native content */}</Draggable>
      </Droppable>
    </DropProvider>
  );
}
```

Bundlers select `dist/index.native.js` for React Native and `dist/index.web.js` for web. See
[`WEB_SUPPORT.md`](./WEB_SUPPORT.md) for behavior evidence and intentional web omissions.

## Compatibility contract

The native dependency chain requires React Native 0.80+, Gesture Handler 2.28+, Reanimated
4.2+, and Worklets 0.7+. Platform peers remain optional at this wrapper boundary so a web-only
consumer can use the owned adapter without importing the native animation runtime.
