import { Module } from '@nestjs/common';
import { OrgStatusController } from './org-status.controller';
import { PublicStatusController } from './public-status.controller';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { CheckResultsModule } from '../check-results/check-results.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [
    EndpointsModule,
    CheckResultsModule,
    OrganizationsModule,
    IncidentsModule,
  ],
  controllers: [OrgStatusController, PublicStatusController],
})
export class StatusModule {}
