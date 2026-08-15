import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAcopioDto, UpdateAcopioDto } from './dto/acopio.dto';

@Injectable()
export class AcopiosService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.acopio.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isActive: 'desc' }, { nombre: 'asc' }],
    });
  }

  create(orgId: string, dto: CreateAcopioDto) {
    return this.prisma.acopio.create({
      data: { organizationId: orgId, ...dto, isActive: true },
    });
  }

  async update(orgId: string, acopioId: string, dto: UpdateAcopioDto) {
    await this.requireAcopio(orgId, acopioId);
    const { isActive, ...rest } = dto;
    return this.prisma.acopio.update({
      where: { id: acopioId },
      data: {
        ...rest,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });
  }

  async remove(orgId: string, acopioId: string) {
    await this.requireAcopio(orgId, acopioId);
    await this.prisma.acopio.update({
      where: { id: acopioId },
      data: { isActive: false },
    });
  }

  private async requireAcopio(orgId: string, acopioId: string) {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: acopioId, organizationId: orgId },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado');
    }
    return acopio;
  }
}
