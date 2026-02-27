import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgRole } from '../memberships/schemas/membership.schema';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller()
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('invitations/:token')
  @UseGuards(OptionalJwtAuthGuard)
  async getByToken(
    @Param('token') token: string,
    @CurrentUser('email') currentUserEmail?: string,
  ) {
    const info = await this.invitationsService.getByToken(
      token,
      currentUserEmail ?? null,
    );
    if (!info) return { valid: false };
    return { valid: true, ...info };
  }

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  async accept(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitationsService.accept(token, userId);
  }

  @Post('orgs/:orgId/invitations')
  @UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
  @RequireRole('admin')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { email: string; role: OrgRole },
  ) {
    const inv = await this.invitationsService.create(
      orgId,
      userId,
      body.email.trim(),
      body.role ?? 'member',
    );
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'invitation.created',
      resourceType: 'invitation',
      resourceId: String(inv._id),
      metadata: { inviteeEmail: body.email.trim(), role: body.role ?? 'member' },
    });
    return inv;
  }

  @Get('orgs/:orgId/invitations')
  @UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
  @RequireRole('admin')
  async listPending(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitationsService.listPending(orgId, userId);
  }

  @Post('orgs/:orgId/invitations/:invitationId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
  @RequireRole('admin')
  async cancel(
    @Param('orgId') orgId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.invitationsService.cancel(orgId, invitationId, userId);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'invitation.cancelled',
      resourceType: 'invitation',
      resourceId: invitationId,
    });
  }
}
