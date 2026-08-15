import { ApiProperty } from '@nestjs/swagger';
import type { AuthSession, AuthUser, Captcha } from '@soschoco/shared';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
