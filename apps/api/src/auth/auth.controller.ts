import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
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
  @ApiOperation({ summary: 'Registro con usuario, contraseña y captcha' })
  @ApiCreatedResponse({ type: AuthTokenDto })
  @ApiConflictResponse({ description: 'Usuario o correo ya existen' })
  @ApiUnprocessableEntityResponse({ description: 'Captcha inválido' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login con usuario o correo, contraseña y captcha' })
  @ApiOkResponse({ type: AuthTokenDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiUnprocessableEntityResponse({ description: 'Captcha inválido' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
