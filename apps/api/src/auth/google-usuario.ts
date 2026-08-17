/** Derives a valid `usuario` suggestion from an email local-part. */
export function suggestUsuarioFromCorreo(correo: string): string {
  const local = correo.split('@')[0] ?? 'usuario';
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32);
  if (cleaned.length >= 3) return cleaned;
  return `user${cleaned.replace(/\D/g, '') || '1'}`.slice(0, 32);
}
