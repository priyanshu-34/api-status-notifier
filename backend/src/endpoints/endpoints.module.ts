import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EndpointsService } from './endpoints.service';
import { OrgEndpointsController } from './org-endpoints.controller';
import { Endpoint, EndpointSchema } from './schemas/endpoint.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Endpoint.name, schema: EndpointSchema }]),
    OrganizationsModule,
    AuditLogModule,
  ],
  controllers: [OrgEndpointsController],
  providers: [EndpointsService],
  exports: [EndpointsService],
})
export class EndpointsModule {}
