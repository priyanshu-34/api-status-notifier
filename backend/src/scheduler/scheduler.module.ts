import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { CheckResultsModule } from '../check-results/check-results.module';
import { CheckerModule } from '../checker/checker.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EndpointsModule,
    CheckResultsModule,
    CheckerModule,
    NotificationsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
