import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import { CaptchaService } from './captcha.service';
import type {
  CompleteGoogleProfileDto,
  GoogleSignInDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { EmailVerificationService } from './email-verification.service';
import { GoogleAuthService } from './google-auth.service';
import { suggestUsuarioFromCorreo } from './google-usuario';
import { PasswordService } from './password.service';

type GoogleProfileJwt = {
  typ: 'google_profile';
  googleId: string;
  correo: string;
  nombre: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly captcha: CaptchaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly emailVerification: EmailVerificationService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  async register(dto: RegisterDto) {
    await this.captcha.consume(dto.captchaId, dto.captchaAnswer);
    const usuario = dto.usuario.trim().toLowerCase();
    const correo = dto.correo.trim().toLowerCase();

    const taken = await this.prisma.user.findFirst({
      where: { OR: [{ usuario }, { correo }] },
    });
    if (taken) {
      throw new ConflictException('El usuario o el correo ya están registrados');
    }

    const user = await this.prisma.user.create({
      data: {
        usuario,
        correo,
        nombre: dto.nombre.trim(),
        passwordHash: await this.passwords.hash(dto.password),
      },
    });

    await this.emailVerification.issueAndDeliver(user);
    return { pendingVerification: true as const, correo: user.correo };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const token = dto.token?.trim();
    const codigo = dto.codigo?.trim();
    const correo = dto.correo?.trim().toLowerCase();

    if (token) {
      const user = await this.emailVerification.consumeToken(token);
      return this.issueToken(this.toAuthUser(user));
    }

    if (codigo && correo) {
      const user = await this.emailVerification.consumeCodigo(correo, codigo);
      return this.issueToken(this.toAuthUser(user));
    }

    throw new UnprocessableEntityException('Falta el código o el enlace de verificación');
  }

  async resendVerification(dto: ResendVerificationDto) {
    await this.emailVerification.resend(dto.correo);
    return { ok: true as const };
  }

  async login(dto: LoginDto) {
    await this.captcha.consume(dto.captchaId, dto.captchaAnswer);
    const identifier = dto.usuario.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ usuario: identifier }, { correo: identifier }] },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Esta cuenta usa Google. Entrá con Google.');
    }
    const ok = await this.passwords.verify(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está dada de baja');
    }
    this.emailVerification.assertVerified(user.correoVerificadoAt);
    return this.issueToken(this.toAuthUser(user));
  }

  async signInWithGoogle(dto: GoogleSignInDto) {
    const profile = await this.googleAuth.verifyCredential(dto.credential);

    const byGoogle = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (byGoogle) {
      return this.loginGoogleUser(byGoogle);
    }

    const byCorreo = await this.prisma.user.findUnique({
      where: { correo: profile.correo },
    });
    if (byCorreo) {
      const linked = await this.prisma.user.update({
        where: { id: byCorreo.id },
        data: {
          googleId: profile.googleId,
          correoVerificadoAt: byCorreo.correoVerificadoAt ?? new Date(),
          nombre: byCorreo.nombre || profile.nombre,
        },
      });
      return this.loginGoogleUser(linked);
    }

    return {
      needsProfile: true as const,
      profileToken: this.issueProfileToken(profile),
      correo: profile.correo,
      nombre: profile.nombre,
      usuarioSugerido: suggestUsuarioFromCorreo(profile.correo),
    };
  }

  async completeGoogleProfile(dto: CompleteGoogleProfileDto) {
    const payload = this.readProfileToken(dto.profileToken);
    const usuario = dto.usuario.trim().toLowerCase();
    const nombre = (dto.nombre ?? payload.nombre).trim();

    const taken = await this.prisma.user.findFirst({
      where: {
        OR: [{ usuario }, { correo: payload.correo }, { googleId: payload.googleId }],
      },
    });
    if (taken) {
      if (taken.googleId === payload.googleId || taken.correo === payload.correo) {
        return this.loginGoogleUser(taken);
      }
      throw new ConflictException('El usuario ya está en uso');
    }

    const user = await this.prisma.user.create({
      data: {
        usuario,
        correo: payload.correo,
        nombre,
        googleId: payload.googleId,
        correoVerificadoAt: new Date(),
        passwordHash: null,
      },
    });

    return this.issueToken(this.toAuthUser(user));
  }

  async findAuthUser(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.isActive || !user.correoVerificadoAt) {
      return null;
    }
    return this.toAuthUser(user);
  }

  private loginGoogleUser(user: {
    id: string;
    usuario: string;
    nombre: string;
    correo: string;
    isActive: boolean;
    correoVerificadoAt: Date | null;
  }) {
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está dada de baja');
    }
    if (!user.correoVerificadoAt) {
      throw new UnauthorizedException('Verificá tu correo antes de entrar');
    }
    return this.issueToken(this.toAuthUser(user));
  }

  private issueProfileToken(profile: {
    googleId: string;
    correo: string;
    nombre: string;
  }): string {
    return this.jwt.sign(
      {
        typ: 'google_profile',
        googleId: profile.googleId,
        correo: profile.correo,
        nombre: profile.nombre,
      } satisfies GoogleProfileJwt,
      {
        secret: this.config.get('JWT_SECRET', { infer: true }),
        expiresIn: '15m',
      },
    );
  }

  private readProfileToken(token: string): GoogleProfileJwt {
    try {
      const payload = this.jwt.verify<GoogleProfileJwt>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
      if (payload.typ !== 'google_profile' || !payload.googleId || !payload.correo) {
        throw new Error('invalid');
      }
      return payload;
    } catch {
      throw new UnprocessableEntityException('El enlace de Google venció. Volvé a intentar.');
    }
  }

  private issueToken(user: AuthUser) {
    const accessToken = this.jwt.sign(
      { sub: user.id, usuario: user.usuario },
      {
        secret: this.config.get('JWT_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_EXPIRES_IN', {
          infer: true,
        }) as `${number}h`,
      },
    );
    return { accessToken, user };
  }

  private toAuthUser(user: {
    id: string;
    usuario: string;
    nombre: string;
    correo: string;
  }): AuthUser {
    return {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
    };
  }
}
