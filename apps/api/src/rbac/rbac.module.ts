import { Module } from '@nestjs/common';
import { OrgRolesController } from './org-roles.controller';
import { RbacService } from './rbac.service';
import { RolesController } from './roles.controller';

@Module({
  controllers: [RolesController, OrgRolesController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
