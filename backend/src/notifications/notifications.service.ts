import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { EndpointDocument } from '../endpoints/schemas/endpoint.schema';
import { CheckResultDocument } from '../check-results/schemas/check-result.schema';
import {
  NotificationConfig,
  NotificationConfigDocument,
} from './schemas/notification-config.schema';
import { Types } from 'mongoose';
import {
  NotificationLog,
  NotificationLogDocument,
  NotificationChannel,
  NotificationReason,
} from './schemas/notification-log.schema';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CheckResultsService } from '../check-results/check-results.service';
import { IncidentsService } from '../incidents/incidents.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class NotificationsService {
  private enableEmail: boolean;
  private enableWebhook: boolean;
  private cooldownMinutes: number;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(NotificationConfig.name)
    private readonly configModel: Model<NotificationConfigDocument>,
    @InjectModel(NotificationLog.name)
    private readonly logModel: Model<NotificationLogDocument>,
    private readonly endpointsService: EndpointsService,
    private readonly checkResultsService: CheckResultsService,
    private readonly incidentsService: IncidentsService,
    private readonly organizationsService: OrganizationsService,
  ) {
    this.enableEmail =
      this.config.get<string>('ENABLE_EMAIL_NOTIFICATIONS', 'false') === 'true';
    this.enableWebhook =
      this.config.get<string>('ENABLE_WEBHOOK_NOTIFICATIONS', 'false') ===
      'true';
    this.cooldownMinutes = parseInt(
      this.config.get<string>('NOTIFICATION_COOLDOWN_MINUTES', '15'),
      10,
    );
  }

  async maybeNotify(
    endpoint: EndpointDocument,
    result: CheckResultDocument,
  ): Promise<void> {
    if (
      endpoint.maintenanceUntil &&
      endpoint.maintenanceUntil > new Date()
    ) {
      return;
    }
    const reason: NotificationReason =
      result.status === 'down' ? 'down' : 'slow';
    const organizationId = this.normalizeObjectIdString(endpoint.organizationId);
    if (!organizationId) return;
    const config = await this.getConfigForNotify(organizationId);
    if (!config) return;
    if (reason === 'down' && !config.notifyOnDown) return;
    if (reason === 'slow' && !config.notifyOnSlow) return;

    const endpointIdStr = String(endpoint._id);
    const cooldownMin = config.cooldownMinutes ?? this.cooldownMinutes;
    const withinCooldown = await this.isWithinCooldown(endpointIdStr, reason, cooldownMin);
    if (withinCooldown) return;

    const emails = this.getEmailsForEndpoint(config, endpointIdStr);
    const webhooks = this.getWebhooksForEndpoint(config, endpointIdStr);

    for (const to of emails) {
      if (!to?.trim()) continue;
      if (this.enableEmail) {
        try {
          await this.sendEmail(endpoint, result, to.trim());
          await this.logNotification(endpointIdStr, 'email', reason, to.trim());
        } catch (err) {
          console.error('Email notification failed:', err);
        }
      }
    }
    for (const wh of webhooks) {
      if (!wh?.url?.trim()) continue;
      if (this.enableWebhook) {
        try {
          await this.sendWebhook(endpoint, result, wh.url.trim());
          await this.logNotification(
            endpointIdStr,
            'webhook',
            reason,
            wh.label ?? wh.url,
          );
        } catch (err) {
          console.error('Webhook notification failed:', err);
        }
      }
    }
  }

  async maybeNotifySlaBreach(
    endpoint: EndpointDocument,
    currentUptimePercent: number,
  ): Promise<void> {
    if (
      endpoint.slaTargetPercent == null ||
      currentUptimePercent >= endpoint.slaTargetPercent
    ) {
      return;
    }
    const organizationId = this.normalizeObjectIdString(endpoint.organizationId);
    if (!organizationId) return;
    const config = await this.getConfigForNotify(organizationId);
    if (!config) return;

    const endpointIdStr = String(endpoint._id);
    const reason: NotificationReason = 'sla_breach';
    const cooldownMin = config.cooldownMinutes ?? this.cooldownMinutes;
    const withinCooldown = await this.isWithinCooldown(endpointIdStr, reason, cooldownMin);
    if (withinCooldown) return;

    const emails = this.getEmailsForEndpoint(config, endpointIdStr);
    const webhooks = this.getWebhooksForEndpoint(config, endpointIdStr);
    const targetPercent = endpoint.slaTargetPercent;
    const windowDays = endpoint.slaWindowDays ?? 30;

    for (const to of emails) {
      if (!to?.trim()) continue;
      if (this.enableEmail) {
        try {
          await this.sendSlaBreachEmail(
            endpoint,
            to.trim(),
            currentUptimePercent,
            targetPercent,
            windowDays,
          );
          await this.logNotification(endpointIdStr, 'email', reason, to.trim());
        } catch (err) {
          console.error('SLA breach email failed:', err);
        }
      }
    }
    for (const wh of webhooks) {
      if (!wh?.url?.trim()) continue;
      if (this.enableWebhook) {
        try {
          await this.sendSlaBreachWebhook(
            endpoint,
            wh.url.trim(),
            currentUptimePercent,
            targetPercent,
            windowDays,
          );
          await this.logNotification(
            endpointIdStr,
            'webhook',
            reason,
            wh.label ?? wh.url,
          );
        } catch (err) {
          console.error('SLA breach webhook failed:', err);
        }
      }
    }
  }

  private async sendSlaBreachEmail(
    endpoint: EndpointDocument,
    to: string,
    currentUptimePercent: number,
    targetPercent: number,
    windowDays: number,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
    const subject = `[API Status] SLA breach: ${endpoint.name} below ${targetPercent}% uptime`;
    const body = `
SLA breach: ${endpoint.name}
URL: ${endpoint.url}
Current uptime (last ${windowDays} days): ${currentUptimePercent}%
Target: ${targetPercent}%
`;
    await transporter.sendMail({
      from: this.config.get('SMTP_USER', 'noreply@localhost'),
      to,
      subject,
      text: body,
    });
  }

  private async sendSlaBreachWebhook(
    endpoint: EndpointDocument,
    webhookUrl: string,
    currentUptimePercent: number,
    targetPercent: number,
    windowDays: number,
  ): Promise<void> {
    await axios.post(
      webhookUrl,
      {
        type: 'sla_breach',
        endpoint: {
          id: String(endpoint._id),
          name: endpoint.name,
          url: endpoint.url,
        },
        currentUptimePercent,
        targetPercent,
        windowDays,
        timestamp: new Date().toISOString(),
      },
      { timeout: 10000 },
    );
  }

  private getEmailsFromConfig(
    config: NotificationConfigDocument,
  ): string[] {
    const targets = config.emailTargets?.filter((t) => t?.email?.trim());
    if (targets?.length)
      return [...new Set(targets.map((t) => t.email.trim()))];
    const arr = config.emails?.filter((e) => e?.trim()) ?? [];
    if (arr.length > 0) return arr;
    if (config.email?.trim()) return [config.email.trim()];
    return [];
  }

  private getWebhooksFromConfig(
    config: NotificationConfigDocument,
  ): Array<{ url: string; label?: string | null }> {
    const arr = config.webhooks?.filter((w) => w?.url?.trim()) ?? [];
    if (arr.length > 0)
      return arr.map((w) => ({ url: w.url.trim(), label: w.label ?? null }));
    if (config.webhookUrl?.trim())
      return [{ url: config.webhookUrl.trim(), label: null }];
    return [];
  }

  /** Returns email addresses that are configured for this endpoint (or all if scoping not used). */
  private getEmailsForEndpoint(
    config: NotificationConfigDocument,
    endpointId: string,
  ): string[] {
    const targets = config.emailTargets?.filter((t) => t?.email?.trim());
    if (targets?.length) {
      return targets
        .filter(
          (t) =>
            !t.endpointIds?.length ||
            t.endpointIds.includes(endpointId),
        )
        .map((t) => t.email.trim());
    }
    return this.getEmailsFromConfig(config);
  }

  /** Returns webhooks that are configured for this endpoint (or all if scoping not used). */
  private getWebhooksForEndpoint(
    config: NotificationConfigDocument,
    endpointId: string,
  ): Array<{ url: string; label?: string | null }> {
    const arr = config.webhooks?.filter((w) => w?.url?.trim()) ?? [];
    if (arr.length > 0) {
      return arr
        .filter(
          (w) =>
            !w.endpointIds?.length ||
            w.endpointIds.includes(endpointId),
        )
        .map((w) => ({ url: w.url.trim(), label: w.label ?? null }));
    }
    if (config.webhookUrl?.trim())
      return [{ url: config.webhookUrl.trim(), label: null }];
    return [];
  }

  /** Returns a 24-char hex string if value is a valid ObjectId, otherwise null. */
  private normalizeObjectIdString(value: unknown): string | null {
    if (value == null) return null;
    const str =
      typeof value === 'string'
        ? value
        : typeof (value as { toString?: () => string }).toString === 'function'
          ? (value as { toString: () => string }).toString()
          : String(value);
    return /^[a-f0-9]{24}$/i.test(str) ? str : null;
  }

  private async getConfigForNotify(
    organizationId: string,
  ): Promise<NotificationConfigDocument | null> {
    if (!this.normalizeObjectIdString(organizationId)) return null;
    const config = await this.configModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
    return config;
  }

  private async isWithinCooldown(
    endpointId: string,
    reason: NotificationReason,
    cooldownMinutes: number,
  ): Promise<boolean> {
    const last = await this.logModel
      .findOne({ endpointId: new Types.ObjectId(endpointId), reason })
      .sort({ sentAt: -1 })
      .select('sentAt')
      .lean()
      .exec();
    if (!last) return false;
    const cutoff = new Date(
      Date.now() - cooldownMinutes * 60 * 1000,
    );
    return last.sentAt > cutoff;
  }

  private async logNotification(
    endpointId: string,
    channel: NotificationChannel,
    reason: NotificationReason,
    target?: string,
  ): Promise<void> {
    await this.logModel.create({
      endpointId: new Types.ObjectId(endpointId),
      channel,
      reason,
      target: target ?? undefined,
      sentAt: new Date(),
    });
  }

  private async sendEmail(
    endpoint: EndpointDocument,
    result: CheckResultDocument,
    to: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
    const subject = `[API Status] ${endpoint.name} is ${result.status}`;
    const body = `
Endpoint: ${endpoint.name}
URL: ${endpoint.url}
Status: ${result.status}
${result.statusCode != null ? `HTTP Status: ${result.statusCode}` : ''}
${result.responseTimeMs != null ? `Response time: ${result.responseTimeMs}ms` : ''}
${result.errorMessage ? `Error: ${result.errorMessage}` : ''}
Checked at: ${result.checkedAt.toISOString()}
`;
    await transporter.sendMail({
      from: this.config.get('SMTP_USER', 'noreply@localhost'),
      to,
      subject,
      text: body,
    });
  }

  private async sendWebhook(
    endpoint: EndpointDocument,
    result: CheckResultDocument,
    webhookUrl: string,
  ): Promise<void> {
    await axios.post(
      webhookUrl,
      {
        endpoint: {
          id: String(endpoint._id),
          name: endpoint.name,
          url: endpoint.url,
        },
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.errorMessage,
        timestamp: result.checkedAt.toISOString(),
      },
      { timeout: 10000 },
    );
  }

  async getRecentLogs(
    organizationId: string,
    endpointIds: string[],
    limit = 50,
  ): Promise<Array<Record<string, unknown> & { endpoint?: { name: string; url: string } }>> {
    if (endpointIds.length === 0) return [];
    const logs = await this.logModel
      .find({ endpointId: { $in: endpointIds.map((id) => new Types.ObjectId(id)) } })
      .sort({ sentAt: -1 })
      .limit(limit)
      .populate('endpointId', 'name url')
      .lean()
      .exec();
    return logs.map((log) => {
      const row = log as unknown as Record<string, unknown>;
      const populated = row.endpointId as { name?: string; url?: string } | null;
      return {
        ...row,
        id: String(row._id),
        endpointId: String(row.endpointId),
        endpoint:
          populated && typeof populated === 'object' && 'name' in populated
            ? { name: populated.name, url: populated.url }
            : undefined,
      };
    });
  }

  async getConfig(
    organizationId: string,
  ): Promise<NotificationConfigDocument | null> {
    return this.configModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  async updateConfig(
    organizationId: string,
    update: Partial<Omit<NotificationConfig, 'organizationId'>>,
  ): Promise<NotificationConfigDocument> {
    const filtered = Object.fromEntries(
      Object.entries(update).filter(([, v]) => v !== undefined),
    ) as Partial<NotificationConfig>;
    // When saving webhooks (including []), clear legacy webhookUrl so it doesn't reappear
    if ('webhooks' in filtered)
      (filtered as Record<string, unknown>).webhookUrl = null;
    // Normalize: if emailTargets provided, derive emails for legacy; if only emails provided, convert to emailTargets (all endpoints)
    if ('emailTargets' in filtered && Array.isArray(filtered.emailTargets)) {
      (filtered as Record<string, unknown>).emails = filtered.emailTargets
        .filter((t) => t?.email?.trim())
        .map((t) => t.email.trim());
    } else if ('emails' in filtered && Array.isArray(filtered.emails)) {
      (filtered as Record<string, unknown>).emailTargets = filtered.emails
        .filter((e) => typeof e === 'string' && (e as string).trim())
        .map((e) => ({ email: (e as string).trim(), endpointIds: [] }));
    }
    let config = await this.configModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
    if (!config) {
      config = await this.configModel.create({
        organizationId: new Types.ObjectId(organizationId),
        email: null,
        webhookUrl: null,
        emails: [],
        webhooks: [],
        digestEnabled: false,
        digestFrequency: 'weekly',
        digestDayOfWeek: 1,
        notifyOnDown: true,
        notifyOnSlow: true,
        cooldownMinutes: this.cooldownMinutes,
        ...filtered,
      });
    } else {
      config.set(filtered);
      await config.save();
    }
    return config;
  }

  async getConfigsWithDigestEnabled(): Promise<NotificationConfigDocument[]> {
    return this.configModel.find({ digestEnabled: true }).exec();
  }

  async sendDigest(
    organizationId: string,
    notificationConfig: NotificationConfigDocument,
  ): Promise<void> {
    if (!this.enableEmail) return;
    const periodHours =
      notificationConfig.digestFrequency === 'daily' ? 24 : 168;
    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const org = await this.organizationsService.findById(organizationId);
    const orgName = org?.name ?? 'Organization';
    const endpoints = await this.endpointsService.findAll(organizationId);
    const endpointIds = endpoints.map((e) => String(e._id));
    const statsMap = await this.checkResultsService.getDigestStatsForEndpoints(
      endpointIds,
      periodHours,
    );
    const incidents = await this.incidentsService.findSince(
      organizationId,
      since,
      20,
    );
    const nameById = new Map(endpoints.map((e) => [String(e._id), e.name]));
    const periodLabel =
      notificationConfig.digestFrequency === 'daily' ? 'Last 24 hours' : 'Last 7 days';
    const lines: string[] = [
      `API Status Digest – ${orgName}`,
      periodLabel,
      '',
      '--- Uptime by endpoint ---',
    ];
    const sortedByAvg = [...endpointIds].sort((a, b) => {
      const sa = statsMap.get(a);
      const sb = statsMap.get(b);
      const avgA = sa?.avgResponseTimeMs ?? 0;
      const avgB = sb?.avgResponseTimeMs ?? 0;
      return avgB - avgA;
    });
    for (const id of sortedByAvg) {
      const name = nameById.get(id) ?? id;
      const s = statsMap.get(id);
      if (s) {
        lines.push(
          `${name}: ${s.uptimePercent}% uptime, ${s.totalChecks} checks, avg ${s.avgResponseTimeMs}ms`,
        );
      }
    }
    if (incidents.length > 0) {
      lines.push('', '--- Incidents ---');
      for (const inc of incidents) {
        lines.push(
          `- ${inc.title ?? 'Incident'} (${inc.status}) at ${inc.startedAt.toISOString()}` +
            (inc.resolvedAt ? ` resolved ${inc.resolvedAt.toISOString()}` : ''),
        );
      }
    }
    const body = lines.join('\n');
    const emails = this.getEmailsFromConfig(notificationConfig);
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
    for (const to of emails) {
      if (!to?.trim()) continue;
      try {
        await transporter.sendMail({
          from: this.config.get('SMTP_USER', 'noreply@localhost'),
          to: to.trim(),
          subject: `[API Status] Digest – ${orgName} – ${periodLabel}`,
          text: body,
        });
      } catch (err) {
        console.error('Digest email failed:', err);
      }
    }
  }
}
