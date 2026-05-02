import { copyFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const policySource = resolve('policy.json');
const policyTarget = resolve('dist/policy.json');
const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_YAHTZEE_COMMIT_HASH': JSON.stringify(commitHash),
  },
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
