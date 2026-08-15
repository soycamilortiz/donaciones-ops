import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Basic auth para el panel.
 *
 * La comparación es de tiempo constante: es un endpoint expuesto y comparar con
 * `===` filtra información sobre la contraseña por el tiempo de respuesta.
 */
export function basicAuth(usuario: string, password: string) {
  const esperado = Buffer.from(`${usuario}:${password}`);

  return (req: Request, res: Response, next: NextFunction): void => {
    const cabecera = req.headers.authorization ?? '';
    const [esquema, credenciales] = cabecera.split(' ');

    if (esquema?.toLowerCase() === 'basic' && credenciales) {
      const recibido = Buffer.from(Buffer.from(credenciales, 'base64').toString('utf8'));
      if (recibido.length === esperado.length && timingSafeEqual(recibido, esperado)) {
        next();
        return;
      }
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Panel de jobs", charset="UTF-8"');
    res.status(401).send('No autorizado');
  };
}
