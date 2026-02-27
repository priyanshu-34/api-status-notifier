import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { NotificationConfig } from './schemas/notification-config.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('orgs/:orgId/notifications')
@UseGuards(JwtAuthGuard, OrgMemberGuard)
export class OrgNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly endpointsService: EndpointsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('config')
  @UseGuards(RolesGuard)
  @RequireRole('member')
  getConfig(@Param('orgId') orgId: string) {
    return this.notificationsService.getConfig(orgId);
  }

  @Patch('config')
  @UseGuards(RolesGuard)
  @RequireRole('member')
  async updateConfig(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: Partial<NotificationConfig>,
  ) {
    const config = await this.notificationsService.updateConfig(orgId, body);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'config.updated',
      resourceType: 'notification_config',
      resourceId: String(config._id),
    });
    return config;
  }

  @Get('log')
  @UseGuards(RolesGuard)
  @RequireRole('viewer')
  async getRecentLogs(@Param('orgId') orgId: string) {
    const endpoints = await this.endpointsService.findAll(orgId);
    const endpointIds = endpoints.map((e) => String(e._id));
    return this.notificationsService.getRecentLogs(orgId, endpointIds, 50);
  }
}
