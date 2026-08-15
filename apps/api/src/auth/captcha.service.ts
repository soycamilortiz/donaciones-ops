import { createHash, randomUUID } from 'crypto';
import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import svgCaptcha from 'svg-captcha';
import { PrismaService } from '../prisma/prisma.service';

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CaptchaService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(): Promise<{ captchaId: string; svg: string }> {
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
    return { captchaId: id, svg: captcha.data };
  }

  async consume(captchaId: string, answer: string): Promise<void> {
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
