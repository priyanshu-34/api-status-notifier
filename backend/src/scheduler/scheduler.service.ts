import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CheckResultsService } from '../check-results/check-results.service';
import { CheckerService } from '../checker/checker.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly endpointsService: EndpointsService,
    private readonly checkResultsService: CheckResultsService,
    private readonly checkerService: CheckerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/2 * * * *')
  async runScheduledChecks(): Promise<void> {
    const endpoints = await this.endpointsService.findAllForScheduler();
    const now = new Date();

    for (const endpoint of endpoints) {
      const lastChecked = await this.checkResultsService.getLastCheckedAt(
        endpoint,
      );
      const intervalMs = endpoint.checkIntervalMinutes * 60 * 1000;
      const nextCheckAt = lastChecked
        ? new Date(lastChecked.getTime() + intervalMs)
        : new Date(0);
      const inMaintenance =
        endpoint.maintenanceUntil && endpoint.maintenanceUntil > now;
      if (inMaintenance) continue;
      if (now >= nextCheckAt) {
        try {
          await this.checkerService.checkEndpoint(endpoint);
        } catch (err) {
          console.error(`Check failed for endpoint ${endpoint._id}:`, err);
        }
      }
    }
  }

  @Cron('0 9 * * *')
  async runDigests(): Promise<void> {
    const configs = await this.notificationsService.getConfigsWithDigestEnabled();
    const today = new Date().getDay();
    for (const c of configs) {
      const orgId = String(c.organizationId);
      const send =
        c.digestFrequency === 'daily' ||
        (c.digestFrequency === 'weekly' && c.digestDayOfWeek === today);
      if (send) {
        try {
          await this.notificationsService.sendDigest(orgId, c);
        } catch (err) {
          console.error(`Digest failed for org ${orgId}:`, err);
        }
      }
    }
  }
}
