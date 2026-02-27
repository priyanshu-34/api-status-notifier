import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EndpointsModule } from './endpoints/endpoints.module';
import { CheckResultsModule } from './check-results/check-results.module';
import { CheckerModule } from './checker/checker.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StatusModule } from './status/status.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  imports: [
    AuditLogModule,
    IncidentsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    OrganizationsModule,
    InvitationsModule,
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri =
          process.env.MONGODB_URI ||
          process.env.DATABASE_URL ||
          'mongodb://localhost:27017/api_status_notifier';
        return { uri };
      },
    }),
    EndpointsModule,
    CheckResultsModule,
    CheckerModule,
    NotificationsModule,
    SchedulerModule,
    StatusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
