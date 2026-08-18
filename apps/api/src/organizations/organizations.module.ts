import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PasswordService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
