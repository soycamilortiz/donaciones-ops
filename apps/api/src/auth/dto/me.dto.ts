import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Ana Restrepo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;
}

export class RoleSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  nombre: string;
}

export class OrganizationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  tipo: string;
}

export class MembershipDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty({ type: RoleSummaryDto })
  role: RoleSummaryDto;

  @ApiProperty({ type: OrganizationSummaryDto })
  organization: OrganizationSummaryDto;

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  usuario: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  correo: string;

  @ApiProperty({ type: [MembershipDto] })
  memberships: MembershipDto[];
}
