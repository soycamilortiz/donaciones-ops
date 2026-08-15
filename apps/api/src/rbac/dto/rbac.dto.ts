import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/soft-delete';

export class PermissionDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  descripcion?: string | null;
}

export class RoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  descripcion?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [PermissionDto] })
  permissions: PermissionDto[];
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Logística' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'logistica',
    description: 'Si no se envía, se genera a partir del nombre',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El slug solo admite minúsculas, números y guion bajo',
  })
  slug?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['org:read', 'acopios:read'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionSlugs: string[];
}

export class UpdatePermissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  descripcion?: string;
}
