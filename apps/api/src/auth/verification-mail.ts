const BRAND = '#1f4d3a';
const PAPER = '#fffdf8';
const INK = '#1c241c';
const MUTED = '#5c6759';

export type VerificationMailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildVerificationMail(input: {
  nombre: string;
  codigo: string;
  verifyUrl: string;
}): VerificationMailContent {
  const subject = 'Verificá tu correo en SOS Chocó';
  const text = [
    `Hola ${input.nombre},`,
    '',
    'Para terminar el registro en SOS Chocó, usá este código:',
    input.codigo,
    '',
    `O abrí este enlace (vence en 24 horas):`,
    input.verifyUrl,
    '',
    'Si no creaste esta cuenta, ignorá este mensaje.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3efe6;font-family:'Segoe UI',system-ui,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${PAPER};border:1px solid #d9d2c3;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND};color:${PAPER};padding:20px 24px;font-size:20px;font-weight:700;">
              SOS Chocó
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(input.nombre)},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${MUTED};">
                Para terminar el registro, ingresá este código o tocá el botón. Vence en 24 horas.
              </p>
              <p style="margin:0 0 20px;text-align:center;font-size:28px;letter-spacing:6px;font-weight:700;color:${BRAND};">
                ${escapeHtml(input.codigo)}
              </p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:${BRAND};color:${PAPER};text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">
                  Verificar correo
                </a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.4;color:${MUTED};">
                Si no creaste esta cuenta, ignorá este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
