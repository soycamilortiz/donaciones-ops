import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Env } from '../config/env.schema';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const path = request.path || request.originalUrl.split('?')[0];
    if (path.startsWith('/api/docs')) {
      return true;
    }

    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
      const user = await this.auth.findAuthUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Sesión inválida');
      }
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }

  private extractBearer(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length).trim();
  }
}
