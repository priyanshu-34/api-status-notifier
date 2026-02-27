import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgRole } from '../memberships/schemas/membership.schema';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('orgs/:orgId/members')
@UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
@RequireRole('admin')
export class OrgMembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  list(@Param('orgId') orgId: string, @CurrentUser('id') userId: string) {
    return this.membersService.findAll(orgId, userId);
  }

  @Post()
  async add(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { email: string; role: OrgRole },
  ) {
    const result = await this.membersService.addMember(orgId, userId, body.email, body.role);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'member.added',
      resourceType: 'member',
      resourceId: String(result.userId),
      metadata: { email: body.email, role: body.role },
    });
    return result;
  }

  @Patch(':memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('orgId') orgId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { role?: OrgRole } | { remove: true },
  ) {
    const update = body && 'remove' in body && body.remove ? null : (body as { role?: OrgRole });
    await this.membersService.updateMember(orgId, userId, memberUserId, update);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: update ? 'member.updated' : 'member.removed',
      resourceType: 'member',
      resourceId: memberUserId,
      metadata: update ? { role: update.role } : undefined,
    });
  }
}
