// LOOPER — self-contained runtime.
//
// No `npm install`. No `next build`. No network. Just:
//     node server.mjs
//
// Everything the server needs (the Next runtime + the traced node_modules +
// the prebuilt pages and assets) is committed under ./dist by the build step
// that ran on a machine with registry access. This wrapper just boots it.
//
// Override the port with PORT=xxxx node server.mjs  (default 3000).

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const entry = join(dist, 'server.js');

if (!existsSync(entry)) {
  console.error(
    '\n  dist/server.js is missing — the prebuilt runtime was not found.\n' +
      '  Re-clone the repo (the runtime is committed), or rebuild with:\n' +
      '      npm install && npm run bundle\n',
  );
  process.exit(1);
}

if (!process.env.PORT) process.env.PORT = '3000';
if (!process.env.HOSTNAME) process.env.HOSTNAME = '0.0.0.0';

// Next's standalone server resolves its app relative to its own location, but
// run it with cwd = dist so any relative reads resolve there too.
process.chdir(dist);
console.log(`LOOPER → http://localhost:${process.env.PORT}  (self-contained · no install, no build)`);
await import(entry);
