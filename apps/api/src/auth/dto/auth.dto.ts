import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AuthSession,
  AuthUser,
  Captcha,
  GoogleProfilePending,
  RegisterPendingVerification,
} from '@soschoco/shared';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CaptchaResponseDto implements Captcha {
  @ApiProperty()
  captchaId: string;

  @ApiProperty({ description: 'SVG del captcha' })
  svg: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Ana Restrepo' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'ana.restrepo' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'El usuario solo admite letras, números, punto y guion bajo',
  })
  usuario: string;

  @ApiProperty({ example: 'ana@org.org' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'ClaveSegura1' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password: string;

  @ApiProperty()
  @IsString()
  captchaId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  captchaAnswer: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ana.restrepo', description: 'Usuario o correo' })
  @IsString()
  @MinLength(3)
  usuario: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  captchaId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  captchaAnswer: string;
}

export class AuthUserDto implements AuthUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  usuario: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  correo: string;
}

export class AuthTokenDto implements AuthSession {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class RegisterPendingDto implements RegisterPendingVerification {
  @ApiProperty({ example: true })
  pendingVerification: true;

  @ApiProperty({ example: 'ana@org.org' })
  correo: string;
}

export class VerifyEmailDto {
  @ApiPropertyOptional({ description: 'Token del enlace del correo' })
  @IsOptional()
  @IsString()
  @MinLength(16)
  token?: string;

  @ApiPropertyOptional({ example: 'ana@org.org' })
  @IsOptional()
  @IsEmail()
  correo?: string;

  @ApiPropertyOptional({ example: '482193', description: 'Código de 6 dígitos' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  codigo?: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'ana@org.org' })
  @IsEmail()
  correo: string;
}

export class GoogleSignInDto {
  @ApiProperty({ description: 'ID token (credential) del botón de Google' })
  @IsString()
  @MinLength(20)
  credential: string;
}

export class CompleteGoogleProfileDto {
  @ApiProperty({ description: 'Token devuelto cuando falta completar el perfil' })
  @IsString()
  @MinLength(20)
  profileToken: string;

  @ApiProperty({ example: 'ana.restrepo' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'El usuario solo admite letras, números, punto y guion bajo',
  })
  usuario: string;

  @ApiPropertyOptional({ example: 'Ana Restrepo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;
}

export class GoogleProfilePendingDto implements GoogleProfilePending {
  @ApiProperty({ example: true })
  needsProfile: true;

  @ApiProperty()
  profileToken: string;

  @ApiProperty()
  correo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  usuarioSugerido: string;
}
