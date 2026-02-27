import { Module } from '@nestjs/common';
import { CheckerService } from './checker.service';
import { CheckResultsModule } from '../check-results/check-results.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CheckResultsModule, NotificationsModule],
  providers: [CheckerService],
  exports: [CheckerService],
})
export class CheckerModule {}
