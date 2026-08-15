# Changesets

Cada cambio de producto (API, web, infra, Prisma) lleva un archivo aquí.

```bash
npm run changeset
```

Elegí `soschoco` y el bump (`patch` / `minor` / `major`). El resumen va en español: el **porqué**, no un listado de archivos.

No publicamos a npm: Changesets es el historial de versiones del producto. Al versionar:

```bash
npm run changeset:version
```

eso consume los `.md` pendientes, sube `package.json` y escribe `CHANGELOG.md`.
