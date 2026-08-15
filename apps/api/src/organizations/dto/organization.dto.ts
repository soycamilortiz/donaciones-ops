import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationTipo } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Fundación Río Atrato' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @ApiProperty({ example: 'contacto@ejemplo.org' })
  @IsEmail()
  correo: string;

  @ApiProperty({ enum: OrganizationTipo })
  @IsEnum(OrganizationTipo)
  tipo: OrganizationTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipoDetalle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  correo?: string;

  @ApiPropertyOptional({ enum: OrganizationTipo })
  @IsOptional()
  @IsEnum(OrganizationTipo)
  tipo?: OrganizationTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipoDetalle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class AddMemberDto {
  @ApiProperty({ example: 'colaborador@ejemplo.org' })
  @IsEmail()
  correo: string;

  @ApiPropertyOptional({
    example: 'voluntario',
    description: 'Slug del rol. Default: voluntario',
  })
  @IsOptional()
  @IsString()
  roleSlug?: string;
}

export class UpdateMemberDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  roleSlug: string;
}

export class OrganizationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  correo: string;

  @ApiProperty({ enum: OrganizationTipo })
  tipo: OrganizationTipo;

  @ApiPropertyOptional()
  tipoDetalle?: string | null;

  @ApiPropertyOptional()
  telefono?: string | null;

  @ApiPropertyOptional()
  descripcion?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class MemberDto {
  @ApiProperty()
  membershipId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  usuario: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  correo: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  roleSlug: string;

  @ApiProperty()
  roleNombre: string;
}
