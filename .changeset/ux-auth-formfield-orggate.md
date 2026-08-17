---
"soschoco": patch
---

UI/UX: el botón de entrar y registrarse se bloquea mientras la petición está en vuelo (el captcha es de un solo uso y el segundo toque lo gastaba), los errores y pistas de `FormField` quedan asociados al campo que describen (`aria-describedby`, `aria-invalid`, `aria-required`) y el arranque de sesión deja de ser un callejón sin salida: carga anunciada, error localizado con Reintentar y salida a /empezar cuando no hay organización activa.
