import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { EndpointDocument } from '../endpoints/schemas/endpoint.schema';
import { CheckResultsService } from '../check-results/check-results.service';
import {
  CheckResultDocument,
  CheckStatus,
} from '../check-results/schemas/check-result.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CheckerService {
  constructor(
    private readonly checkResultsService: CheckResultsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkEndpoint(endpoint: EndpointDocument): Promise<CheckResultDocument> {
    const start = Date.now();
    let status: CheckStatus = 'up';
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const config: AxiosRequestConfig = {
        method: endpoint.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: endpoint.url,
        timeout: endpoint.timeoutMs,
        validateStatus: () => true,
      };
      if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
        config.headers = { ...config.headers, ...endpoint.headers };
      }
      if (endpoint.authType === 'basic' && endpoint.authUsername) {
        config.auth = {
          username: endpoint.authUsername,
          password: endpoint.authPassword ?? '',
        };
      } else if (
        endpoint.authType === 'bearer' &&
        endpoint.authBearerToken
      ) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] =
          'Bearer ' + endpoint.authBearerToken;
      }
      const response = await axios(config);
      const responseTimeMs = Date.now() - start;
      statusCode = response.status;

      if (response.status !== endpoint.expectedStatus) {
        status = 'down';
        errorMessage = `Expected status ${endpoint.expectedStatus}, got ${response.status}`;
      } else if (responseTimeMs > endpoint.slowThresholdMs) {
        status = 'slow';
        errorMessage = `Response time ${responseTimeMs}ms exceeds threshold ${endpoint.slowThresholdMs}ms`;
      }

      const result = await this.checkResultsService.create({
        endpointId: String(endpoint._id),
        status,
        statusCode,
        responseTimeMs,
        errorMessage,
      });

      if (status === 'down' || status === 'slow') {
        await this.notificationsService.maybeNotify(endpoint, result);
      }
      if (endpoint.slaTargetPercent != null) {
        const hours = (endpoint.slaWindowDays ?? 30) * 24;
        const uptime = await this.checkResultsService.getUptimePercent(
          String(endpoint._id),
          hours,
        );
        if (
          uptime &&
          uptime.uptimePercent < endpoint.slaTargetPercent
        ) {
          await this.notificationsService.maybeNotifySlaBreach(
            endpoint,
            uptime.uptimePercent,
          );
        }
      }
      return result;
    } catch (err: unknown) {
      const responseTimeMs = Date.now() - start;
      status = 'down';
      errorMessage = err instanceof Error ? err.message : String(err);

      const result = await this.checkResultsService.create({
        endpointId: String(endpoint._id),
        status,
        statusCode: null,
        responseTimeMs,
        errorMessage,
      });
      await this.notificationsService.maybeNotify(endpoint, result);
      if (endpoint.slaTargetPercent != null) {
        const hours = (endpoint.slaWindowDays ?? 30) * 24;
        const uptime = await this.checkResultsService.getUptimePercent(
          String(endpoint._id),
          hours,
        );
        if (
          uptime &&
          uptime.uptimePercent < endpoint.slaTargetPercent
        ) {
          await this.notificationsService.maybeNotifySlaBreach(
            endpoint,
            uptime.uptimePercent,
          );
        }
      }
      return result;
    }
  }
}
