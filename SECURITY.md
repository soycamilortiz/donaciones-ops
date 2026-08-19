# Política de seguridad · Security Policy

> Español abajo · [English below](#english)

## Reportar una vulnerabilidad

**No abras un issue público** para reportar vulnerabilidades. Escribí en privado a
**`<CORREO-DE-SEGURIDAD>`** (por ejemplo `seguridad@juntosxchoco.com`) o usá
[GitHub Security Advisories](https://github.com/soycamilortiz/donaciones-ops/security/advisories/new).

Incluí: descripción, pasos para reproducir, impacto y, si podés, una propuesta de
mitigación. Respondemos lo antes posible y coordinamos la divulgación responsable.

## Secretos

Este proyecto **nunca** debe contener credenciales reales en el repositorio:

- Las variables de entorno van en archivos `.env` locales (ignorados por git) y en
  el panel del proveedor de despliegue. El repo solo lleva los `*.env.example`.
- `env.txt`, `.env`, `.env.*`, `*.pem` y `*.key` están en `.gitignore`.
- Hay un escaneo de secretos con **gitleaks** en CI (`.github/workflows/gitleaks.yml`).
  Se recomienda además activar **GitHub secret scanning + push protection**.

Si encontrás un secreto commiteado por error: **avisá de inmediato** por el canal
privado, rotá el secreto (dalo por comprometido) y coordiná la limpieza del
historial.

---

<a name="english"></a>

## Reporting a vulnerability

**Do not open a public issue** for security reports. Email
**`<SECURITY-CONTACT>`** (e.g. `seguridad@juntosxchoco.com`) privately, or use
[GitHub Security Advisories](https://github.com/soycamilortiz/donaciones-ops/security/advisories/new).

Include a description, reproduction steps, impact and, if possible, a suggested
mitigation. We respond as soon as we can and coordinate responsible disclosure.

## Secrets

Real credentials must **never** live in the repository. Environment variables go in
local `.env` files (git-ignored) and in the deployment provider's dashboard; the repo
only ships `*.env.example`. A **gitleaks** scan runs in CI. If you find a committed
secret, report it privately, rotate it (treat it as compromised) and coordinate a
history cleanup.
