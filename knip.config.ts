import { createKnipConfig } from '@ankhorage/devtools/knip';

export default createKnipConfig({
  ignoreDependencies: [],
  ignoreFiles: ['.prettierrc.js', 'eslint.config.mjs'],
});
