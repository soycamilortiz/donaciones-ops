import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceInfoDto } from './dto/service-info.dto';

@ApiTags('sistema')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Metadatos del servicio',
    description:
      'Identidad del API y enlace a Swagger. No requiere autenticación.',
  })
  @ApiOkResponse({ type: ServiceInfoDto })
  getInfo(): ServiceInfoDto {
    return {
      name: 'soschoco-api',
      service: 'SOS Chocó',
      docs: '/api/docs',
    };
  }
}
