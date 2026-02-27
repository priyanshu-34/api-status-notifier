import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  listMyOrgs(@CurrentUser('id') userId: string) {
    return this.organizationsService.findAllForUser(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: { name: string; slug?: string }) {
    return this.organizationsService.create(userId, body);
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  getOne(@Param('orgId') orgId: string, @CurrentUser('id') userId: string) {
    return this.organizationsService.findOne(orgId, userId);
  }

  @Patch(':orgId')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @RequireRole('admin')
  async update(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      statusPageEnabled?: boolean;
      statusPageTitle?: string | null;
      timezone?: string | null;
    },
  ) {
    const org = await this.organizationsService.update(orgId, userId, body);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'config.updated',
      resourceType: 'organization',
      resourceId: orgId,
      metadata: Object.keys(body).reduce(
        (acc, k) => ({ ...acc, [k]: (body as Record<string, unknown>)[k] }),
        {},
      ),
    });
    return org;
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(OrgMemberGuard, RolesGuard)
  @RequireRole('admin')
  async delete(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.organizationsService.delete(orgId, userId);
  }
}
