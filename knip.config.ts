import { createKnipConfig } from '@ankhorage/devtools/knip';

export default createKnipConfig({
  entry: ['examples/src/main.tsx'],
  ignoreDependencies: ['@ankhorage/doctor', 'react-native-web'],
  ignoreFiles: [
    '.prettierrc.js',
    'eslint.config.mjs',
    'eslint.local.config.mjs',
    'prettier.local.config.js',
  ],
});
