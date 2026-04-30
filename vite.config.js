import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const policySource = resolve('policy.json');
const policyTarget = resolve('dist/policy.json');

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'copy-policy-json',
      closeBundle() {
        mkdirSync(dirname(policyTarget), { recursive: true });
        copyFileSync(policySource, policyTarget);
      },
    },
  ],
});
