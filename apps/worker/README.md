# Worker de reconocimiento

Procesa los jobs que encola el API. Es una app aparte de `api` y `web`: un
proceso residente que escucha Redis, no un servidor HTTP.

```bash
docker compose up postgres redis -d
pnpm install                  # desde la raíz
pnpm --filter worker dev
```

Necesita el binario de Tesseract en el sistema. En la imagen Docker ya viene
(`tesseract-ocr` + `tesseract-ocr-data-spa`); en el host:

```bash
sudo apt install tesseract-ocr tesseract-ocr-spa
```

## Estructura

| Ruta | Qué hay |
| --- | --- |
| `src/manager.ts` | Levanta un Worker de BullMQ por job registrado y centraliza eventos y apagado |
| `src/jobs/registro.ts` | La lista de jobs que atiende este worker |
| `src/jobs/tipos.ts` | El contrato `DefinicionJob` que implementa cada job |
| `src/jobs/reconocer-producto.ts` | OCR de una foto y escritura del resultado relacionado |
| `src/ocr` | Preprocesado con sharp y ejecución de Tesseract |
| `src/productos` | Emparejamiento del texto contra el catálogo |

## Añadir un job

1. Crea `src/jobs/<nombre>.ts` exportando una `DefinicionJob`.
2. Súmalo a `JOBS` en `src/jobs/registro.ts`.

No hay que tocar `main.ts`: el manager levanta un Worker por cada entrada.

## Configuración

Ver `.env.example`. Lo que más se ajusta en operación:

- `OCR_CONCURRENCIA`: imágenes en paralelo por proceso. Tesseract satura CPU,
  así que subirlo por encima del número de núcleos no ayuda.
- `OCR_CONFIANZA_MINIMA`: por debajo de este valor la imagen queda sin producto
  para revisión manual, en vez de arriesgar un dato equivocado.

## Tests

```bash
pnpm --filter worker test
```

No necesitan Redis, Postgres ni Tesseract: el job recibe sus efectos inyectados.
