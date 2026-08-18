import { createHash, randomUUID } from 'node:crypto';
import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import svgCaptcha from 'svg-captcha';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** `CAPTCHA_DISABLED=true`: ni se emite ni se valida. Solo fuera de producción. */
  get disabled(): boolean {
    return this.config.get('CAPTCHA_DISABLED', { infer: true });
  }

  async issue(): Promise<{ captchaId: string; svg: string; disabled: boolean }> {
    if (this.disabled) {
      // Sin fila en la base: no hay nada que consumir después.
      return { captchaId: '', svg: '', disabled: true };
    }

    const captcha = svgCaptcha.create({
      size: 5,
      noise: 3,
      color: true,
      background: '#f3efe6',
      ignoreChars: '0oO1ilI',
    });
    const id = randomUUID();
    await this.prisma.captchaChallenge.create({
      data: {
        id,
        answerHash: this.hashAnswer(captcha.text),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
    return { captchaId: id, svg: captcha.data, disabled: false };
  }

  async consume(captchaId?: string, answer?: string): Promise<void> {
    if (this.disabled) {
      this.logger.warn('CAPTCHA_DISABLED=true · registro y login sin captcha');
      return;
    }
    if (!captchaId || !answer) {
      throw new UnprocessableEntityException('Falta el captcha');
    }

    const row = await this.prisma.captchaChallenge.findUnique({
      where: { id: captchaId },
    });
    if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException('Captcha inválido o vencido');
    }
    if (row.answerHash !== this.hashAnswer(answer)) {
      await this.prisma.captchaChallenge.update({
        where: { id: captchaId },
        data: { consumedAt: new Date() },
      });
      throw new UnprocessableEntityException('Captcha incorrecto');
    }
    await this.prisma.captchaChallenge.update({
      where: { id: captchaId },
      data: { consumedAt: new Date() },
    });
  }

  private hashAnswer(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
  }
}
