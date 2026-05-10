import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '@ankhorage/devtools/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILES = ['examples/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'];

export default createConfig({
  tsconfigRootDir: __dirname,
  project: ['./tsconfig.eslint.json'],
  files: SOURCE_FILES,
  overrides: [
    {
      files: SOURCE_FILES,
      rules: {
        // This package is the compatibility boundary for the upstream package,
        // so importing it is intentional here.
        'no-restricted-imports': 'off',
      },
    },
  ],
});
