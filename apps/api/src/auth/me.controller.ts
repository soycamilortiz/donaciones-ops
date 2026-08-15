import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { MeResponseDto, UpdateMeDto } from './dto/me.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth('jwt')
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Usuario actual y membresías' })
  @ApiOkResponse({ type: MeResponseDto })
  getMe(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.me.getMe(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar nombre local' })
  @ApiOkResponse({ type: MeResponseDto })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto): Promise<MeResponseDto> {
    return this.me.updateMe(user, dto);
  }
}
