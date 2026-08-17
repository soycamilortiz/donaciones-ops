import { UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { validateEnv } from '../config/env.schema';
import type { PrismaService } from '../prisma/prisma.service';
import { CaptchaService } from './captcha.service';

function servicio(disabled: boolean, prisma: Partial<PrismaService> = {}) {
  const config = {
    get: (clave: keyof Env) => (clave === 'CAPTCHA_DISABLED' ? disabled : undefined),
  } as unknown as ConfigService<Env, true>;
  return new CaptchaService(prisma as PrismaService, config);
}

describe('CaptchaService', () => {
  describe('con CAPTCHA_DISABLED=true', () => {
    it('no emite desafío ni toca la base', async () => {
      const captchaChallenge = { create: jest.fn(), findUnique: jest.fn() };
      const service = servicio(true, { captchaChallenge } as unknown as Partial<PrismaService>);

      await expect(service.issue()).resolves.toEqual({
        captchaId: '',
        svg: '',
        disabled: true,
      });
      expect(captchaChallenge.create).not.toHaveBeenCalled();
    });

    it('acepta un login sin captcha', async () => {
      const captchaChallenge = { findUnique: jest.fn() };
      const service = servicio(true, { captchaChallenge } as unknown as Partial<PrismaService>);

      await expect(service.consume(undefined, undefined)).resolves.toBeUndefined();
      expect(captchaChallenge.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('con el captcha activo', () => {
    it('rechaza una petición sin captcha antes de ir a la base', async () => {
      const captchaChallenge = { findUnique: jest.fn() };
      const service = servicio(false, { captchaChallenge } as unknown as Partial<PrismaService>);

      await expect(service.consume(undefined, undefined)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(captchaChallenge.findUnique).not.toHaveBeenCalled();
    });
  });
});

describe('CAPTCHA_DISABLED en el entorno', () => {
  const base = { DATABASE_URL: 'postgresql://x:x@localhost:5432/x' };

  it('viene apagado en local sin configurar nada', () => {
    expect(validateEnv(base).CAPTCHA_DISABLED).toBe(true);
  });

  it('se puede volver a pedir a mano en local', () => {
    expect(validateEnv({ ...base, CAPTCHA_DISABLED: 'false' }).CAPTCHA_DISABLED).toBe(false);
  });

  it('en producción queda puesto sin configurar nada', () => {
    expect(validateEnv({ ...base, NODE_ENV: 'production' }).CAPTCHA_DISABLED).toBe(false);
  });

  it('el compose local puede apagarlo aunque el contenedor sea NODE_ENV=production', () => {
    // Es el caso que la variable viene a resolver: la imagen corre como
    // producción, pero la máquina es la de quien desarrolla.
    expect(
      validateEnv({ ...base, NODE_ENV: 'production', CAPTCHA_DISABLED: 'true' }).CAPTCHA_DISABLED,
    ).toBe(true);
  });

  it('un valor vacío no rompe: cae al default por NODE_ENV', () => {
    // docker-compose pasa `${CAPTCHA_DISABLED:-}`, que llega como cadena vacía.
    expect(validateEnv({ ...base, CAPTCHA_DISABLED: '' }).CAPTCHA_DISABLED).toBe(true);
    expect(
      validateEnv({ ...base, NODE_ENV: 'production', CAPTCHA_DISABLED: '' }).CAPTCHA_DISABLED,
    ).toBe(false);
  });
});

describe('CAPTCHA_DISABLED en el despliegue serverless', () => {
  const base = { DATABASE_URL: 'postgresql://x:x@localhost:5432/x' };

  /** `enServerless` se resuelve al importar el módulo, así que hay que recargarlo. */
  function conVercel<T>(fn: (schema: typeof import('../config/env.schema')) => T): T {
    const previo = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      let salida: T | undefined;
      jest.isolateModules(() => {
        salida = fn(require('../config/env.schema'));
      });
      return salida as T;
    } finally {
      if (previo === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = previo;
      }
    }
  }

  it('no arranca la función con el captcha apagado', () => {
    conVercel(({ validateEnv: validar }) => {
      expect(() => validar({ ...base, CAPTCHA_DISABLED: 'true' })).toThrow(/CAPTCHA_DISABLED/);
    });
  });

  it('arranca normal sin la variable', () => {
    conVercel(({ validateEnv: validar }) => {
      expect(validar({ ...base, NODE_ENV: 'production' }).CAPTCHA_DISABLED).toBe(false);
    });
  });
});
