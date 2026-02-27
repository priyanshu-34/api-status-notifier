import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { OrgNotificationsController } from './org-notifications.controller';
import {
  NotificationConfig,
  NotificationConfigSchema,
} from './schemas/notification-config.schema';
import {
  NotificationLog,
  NotificationLogSchema,
} from './schemas/notification-log.schema';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CheckResultsModule } from '../check-results/check-results.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationConfig.name, schema: NotificationConfigSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
    EndpointsModule,
    OrganizationsModule,
    AuditLogModule,
    CheckResultsModule,
    IncidentsModule,
  ],
  controllers: [OrgNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
