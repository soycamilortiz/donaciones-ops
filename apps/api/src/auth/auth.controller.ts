import { Body, Controller, HttpCode, Post, Get } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import {
  AuthTokenDto,
  CaptchaResponseDto,
  LoginDto,
  RegisterDto,
  RegisterPendingDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Public()
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly captcha: CaptchaService,
  ) {}

  @Get('captcha')
  @ApiOperation({ summary: 'Nuevo captcha (SVG). Vence en 5 minutos.' })
  @ApiOkResponse({ type: CaptchaResponseDto })
  issueCaptcha() {
    return this.captcha.issue();
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registro con usuario, contraseña y captcha. No emite JWT hasta verificar el correo.',
  })
  @ApiCreatedResponse({ type: RegisterPendingDto })
  @ApiConflictResponse({ description: 'Usuario o correo ya existen' })
  @ApiUnprocessableEntityResponse({ description: 'Captcha inválido' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verificar-correo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirma el correo con el token del enlace o el código de 6 dígitos' })
  @ApiOkResponse({ type: AuthTokenDto })
  @ApiUnprocessableEntityResponse({ description: 'Código o enlace inválido' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('verificar-correo/reenviar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reenvía el código de verificación. Siempre responde igual.' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiUnprocessableEntityResponse({ description: 'Cooldown de reenvío' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login con usuario o correo, contraseña y captcha' })
  @ApiOkResponse({ type: AuthTokenDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiForbiddenResponse({ description: 'Correo sin verificar' })
  @ApiUnprocessableEntityResponse({ description: 'Captcha inválido' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
