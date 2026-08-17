import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../config/env.schema';

export type GoogleProfile = {
  googleId: string;
  correo: string;
  nombre: string;
  correoVerificado: boolean;
};

@Injectable()
export class GoogleAuthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async verifyCredential(credential: string): Promise<GoogleProfile> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw new ServiceUnavailableException('Inicio con Google no está configurado');
    }

    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Credencial de Google inválida');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Credencial de Google incompleta');
    }

    return {
      googleId: payload.sub,
      correo: payload.email.trim().toLowerCase(),
      nombre: (payload.name || payload.given_name || payload.email.split('@')[0] || 'Usuario').trim(),
      correoVerificado: payload.email_verified === true,
    };
  }
}
