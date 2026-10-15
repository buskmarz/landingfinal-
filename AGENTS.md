# Better Mood landing and Coffee Lab

Read `docs/COFFEE-LAB.md` when working on Coffee Lab or changing the build/deployment.

- Landing source remains in its current static files and `scripts/`.
- Coffee Lab source is exclusively `apps/coffee-lab/`; follow its AGENTS.md.
- Root `npm run build` creates the complete site in `dist/`. Publish that output, never the repository root or the old Sites build.
- The app is isolated at `/coffee-lab/`; preserve existing menu, APIs, navigation and local user data.
- Preserve existing uncommitted work. Do not reset or stage unrelated changes.
- Document material integration changes and verification in `docs/COFFEE-LAB.md` to retain project continuity.

## Producción Coffee Lab

El usuario eligió conservar la portada pública “Tu pausa de café. Cerca de UPAEP.”. El árbol local incluye otro rediseño pendiente: no publicarlo incidentalmente al actualizar Coffee Lab. Consultar la sección de lanzamiento en docs/COFFEE-LAB.md; mantener el app canónico y compilarlo dentro de la versión de landing autorizada.
