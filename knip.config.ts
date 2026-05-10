import { createKnipConfig } from '@ankhorage/devtools/knip';

export default createKnipConfig({
  entry: ['examples/src/main.tsx'],
  ignoreDependencies: [
    'react-native',
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-web',
  ],
  ignoreFiles: ['.prettierrc.js', 'eslint.config.mjs'],
});
