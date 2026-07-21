// Rebuild the self-contained runtime under ./dist from a Next standalone build.
// `npm run bundle` runs `next build` first, then this assembles dist/.
// Run it on a machine WITH network; commit dist/; then `node server.mjs` runs
// anywhere with no install and no build.

import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const STANDALONE = '.next/standalone';
if (!existsSync(STANDALONE)) {
  console.error('No .next/standalone — run `next build` first (next.config must set output: "standalone").');
  process.exit(1);
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp(STANDALONE, 'dist', { recursive: true });
await mkdir('dist/.next', { recursive: true });
await cp('.next/static', 'dist/.next/static', { recursive: true });
if (existsSync('public')) await cp('public', 'dist/public', { recursive: true });

console.log('dist/ rebuilt. Commit it, then `node server.mjs` runs with no install and no build.');
