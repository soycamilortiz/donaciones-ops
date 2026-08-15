import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import { CaptchaService } from './captcha.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly captcha: CaptchaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
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

    return this.issueToken(this.toAuthUser(user));
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
    const ok = await this.passwords.verify(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueToken(this.toAuthUser(user));
  }

  async findAuthUser(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toAuthUser(user) : null;
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
