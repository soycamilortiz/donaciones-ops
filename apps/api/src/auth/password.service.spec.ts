import { PasswordService } from './password.service';

describe('PasswordService.generateTemporary', () => {
  const passwords = new PasswordService();

  it('respeta el largo pedido', () => {
    expect(passwords.generateTemporary()).toHaveLength(10);
    expect(passwords.generateTemporary(16)).toHaveLength(16);
  });

  it('solo usa caracteres alfanuméricos legibles (sin 0/O/1/l/I)', () => {
    const clave = passwords.generateTemporary(500);
    expect(clave).toMatch(/^[a-zA-Z2-9]+$/);
    expect(clave).not.toMatch(/[0O1lI]/);
  });

  it('no devuelve siempre la misma clave', () => {
    const claves = new Set(Array.from({ length: 25 }, () => passwords.generateTemporary()));
    expect(claves.size).toBeGreaterThan(1);
  });
});
