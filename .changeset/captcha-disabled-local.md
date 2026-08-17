---
"soschoco": minor
---

`CAPTCHA_DISABLED` apaga el captcha de registro y login en local: el API no emite ni valida el desafío y el front no dibuja el campo. El `.env.example` lo trae en `true` porque leer un SVG por intento mientras se prueba es fricción pura. En la función serverless la variable no se respeta: con `true` el arranque falla, porque hoy el captcha es lo único que frena la fuerza bruta contra el login.
