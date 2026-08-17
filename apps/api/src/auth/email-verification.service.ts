import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { buildVerificationMail } from './verification-mail';

const TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

type IssuedSecrets = { token: string; codigo: string };

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issueAndDeliver(user: { id: string; nombre: string; correo: string }): Promise<void> {
    const secrets = await this.rotateChallenge(user.id);
    await this.deliver(user, secrets);
  }

  async resend(correo: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { correo: correo.trim().toLowerCase() },
    });
    if (!user || user.correoVerificadoAt) {
      // Same message either way: do not leak whether the mailbox exists.
      return;
    }

    const latest = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new UnprocessableEntityException('Esperá un minuto antes de pedir otro código');
    }

    const secrets = await this.rotateChallenge(user.id);
    await this.deliver(user, secrets);
  }

  async consumeToken(token: string) {
    return this.consumeByHash('tokenHash', this.hash(token.trim()));
  }

  async consumeCodigo(correo: string, codigo: string) {
    const user = await this.prisma.user.findUnique({
      where: { correo: correo.trim().toLowerCase() },
    });
    if (!user) {
      throw new UnprocessableEntityException('Código inválido o vencido');
    }
    return this.consumeByHash('codigoHash', this.hash(codigo.trim()), user.id);
  }

  assertVerified(correoVerificadoAt: Date | null): void {
    if (!correoVerificadoAt) {
      throw new ForbiddenException('Verificá tu correo antes de entrar');
    }
  }

  private async rotateChallenge(userId: string): Promise<IssuedSecrets> {
    const token = randomBytes(32).toString('hex');
    const codigo = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + TTL_MS);

    await this.prisma.$transaction([
      this.prisma.emailVerification.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerification.create({
        data: {
          userId,
          tokenHash: this.hash(token),
          codigoHash: this.hash(codigo),
          expiresAt,
        },
      }),
    ]);

    return { token, codigo };
  }

  private async consumeByHash(
    field: 'tokenHash' | 'codigoHash',
    hash: string,
    userId?: string,
  ) {
    const row = await this.prisma.emailVerification.findFirst({
      where:
        field === 'tokenHash'
          ? { tokenHash: hash, consumedAt: null }
          : { codigoHash: hash, consumedAt: null, userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException('Código inválido o vencido');
    }

    if (row.user.correoVerificadoAt) {
      await this.prisma.emailVerification.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });
      return row.user;
    }

    const [, user] = await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { correoVerificadoAt: new Date() },
      }),
    ]);

    return user;
  }

  private async deliver(
    user: { nombre: string; correo: string },
    secrets: IssuedSecrets,
  ): Promise<void> {
    const publicWebUrl = this.config.get('PUBLIC_WEB_URL', { infer: true }).replace(/\/$/, '');
    const verifyUrl = `${publicWebUrl}/verificar-correo?token=${secrets.token}`;
    const send = this.config.get('EMAIL_VERIFICATION', { infer: true });

    if (!send) {
      this.logger.warn(
        `EMAIL_VERIFICATION=false · no se envía mail · correo=${user.correo} codigo=${secrets.codigo} url=${verifyUrl}`,
      );
      return;
    }

    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    if (!apiKey) {
      this.logger.warn(
        `EMAIL_VERIFICATION=true sin RESEND_API_KEY · correo=${user.correo} codigo=${secrets.codigo} url=${verifyUrl}`,
      );
      throw new ServiceUnavailableException('No se pudo enviar el correo de verificación');
    }

    const mail = buildVerificationMail({
      nombre: user.nombre,
      codigo: secrets.codigo,
      verifyUrl,
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.get('MAIL_FROM', { infer: true }),
        to: [user.correo],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Resend ${response.status}: ${detail}`);
      this.logger.warn(
        `Fallo Resend · código en log · correo=${user.correo} codigo=${secrets.codigo} url=${verifyUrl}`,
      );
      throw new ServiceUnavailableException('No se pudo enviar el correo de verificación');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
