# Changesets

El producto se versiona con [Changesets](https://github.com/changesets/changesets). No publicamos paquetes a npm: los archivos en `.changeset/` son el registro de **qué cambió y por qué**.

## Cómo agregar uno

En la raíz del repo (hace falta `npm install` una vez):

```bash
npm run changeset
```

1. Paquete: **soschoco** (el único).
2. Tipo: `patch` (arreglo), `minor` (feature), `major` (rotura).
3. Resumen en español, 1–3 frases, el porqué.

Si el CLI no se puede usar de forma interactiva, creá `.changeset/<nombre>.md` a mano:

```md
---
"soschoco": patch
---

Corrige el reset del formulario de acopios: el `currentTarget` de React queda null después del await.
```

## Versionar (changelog)

Cuando quieran cortar una versión:

```bash
npm run changeset:version
```

Consume los changesets pendientes, sube `version` en el `package.json` raíz y actualiza `CHANGELOG.md`.

## Alcance

Un changeset por cambio de producto: API, web, Prisma, Traefik, env de runtime. No hace falta para solo reglas del agente o docs internas de Cursor.
