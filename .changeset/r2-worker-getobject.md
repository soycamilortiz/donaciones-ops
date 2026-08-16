---
"soschoco": patch
---

El worker baja las fotos de donación por S3 (GetObject). El S3 API no se puede fetch-ear sin firma, así que Tesseract nunca corría.
