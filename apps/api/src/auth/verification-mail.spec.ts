import { buildVerificationMail } from './verification-mail';

describe('buildVerificationMail', () => {
  it('incluye código, nombre y enlace en texto y HTML', () => {
    const mail = buildVerificationMail({
      nombre: 'Ana <Org>',
      codigo: '482193',
      verifyUrl: 'http://localhost/verificar-correo?token=abc',
    });

    expect(mail.subject).toContain('SOS Chocó');
    expect(mail.text).toContain('482193');
    expect(mail.text).toContain('http://localhost/verificar-correo?token=abc');
    expect(mail.html).toContain('482193');
    expect(mail.html).toContain('Ana &lt;Org&gt;');
    expect(mail.html).not.toContain('Ana <Org>');
  });
});
