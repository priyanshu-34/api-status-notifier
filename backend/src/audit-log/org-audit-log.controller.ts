import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';

@Controller('orgs/:orgId/audit-log')
@UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
@RequireRole('viewer')
export class OrgAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async list(
    @Param('orgId') orgId: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.auditLogService.findForOrg(
      orgId,
      { action, userId, from, to },
      limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50,
      offset ? parseInt(offset, 10) || 0 : 0,
    );
    const u = (usr: unknown) => {
      if (!usr || typeof usr !== 'object' || !('_id' in usr))
        return { userId: String(usr), userEmail: null, userName: null };
      return {
        userId: String((usr as { _id: unknown })._id),
        userEmail: (usr as { email?: string }).email ?? null,
        userName: (usr as { name?: string }).name ?? null,
      };
    };
    return {
      items: result.items.map((item) => ({
        id: String(item._id),
        ...u(item.userId),
        action: item.action,
        resourceType: item.resourceType,
        resourceId: item.resourceId ?? null,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
      })),
      total: result.total,
    };
  }
}
