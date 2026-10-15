# Better Mood Coffee Lab

This is the canonical Coffee Lab source inside the landing repository. Work here, not in the earlier Sites checkout.

- Preserve IndexedDB `ritual-coffee-lab`, schema version 1 and backup formats. Do not reset stored data.
- Public base path is `/coffee-lab/`; keep assets, manifest, share links and service worker within this prefix. Never register a service worker at `/`.
- Keep all coffee domain logic in `lib/coffee`; do not add Sites/server dependencies.
- `npm run build` from the repository root builds both projects. Never edit generated `dist`.
- Keep styles and scripts separate from the landing; no Coffee Lab runtime on the home page.
- Run tests, typecheck/build, integration tests and browser QA.
- Root landing already had uncommitted changes before integration; preserve them. See `docs/COFFEE-LAB.md`.
