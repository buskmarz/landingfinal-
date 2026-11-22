import { access, cp, mkdir, rm } from 'node:fs/promises';
// Bundle only compiled app assets. Never copy environment files or local accounts.
const dist = new URL('../dist/', import.meta.url);
const entry = new URL('index.html', dist);
const web = new URL('../native-www/', import.meta.url);
const app = new URL('coffee-lab/', web);
await access(entry);
await mkdir(web, { recursive: true });
// Hashed assets from previous builds should not ship in the next native bundle.
await rm(app, { recursive: true, force: true });
await cp(dist, app, { recursive: true });
await cp(entry, new URL('index.html', web));
