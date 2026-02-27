import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CheckResultsService } from '../check-results/check-results.service';
import { CheckStatus } from '../check-results/schemas/check-result.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';

@Controller('orgs/:orgId/status')
@UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
@RequireRole('viewer')
export class OrgStatusController {
  constructor(
    private readonly endpointsService: EndpointsService,
    private readonly checkResultsService: CheckResultsService,
  ) {}

  @Get()
  async getStatus(
    @Param('orgId') orgId: string,
    @Query('tag') tag?: string,
  ) {
    const endpoints = await this.endpointsService.findAll(
      orgId,
      tag ? { tag } : undefined,
    );
    const ids = endpoints.map((e) => String(e._id));
    const latestMap = await this.checkResultsService.getLatestForAllEndpoints(ids);
    return endpoints.map((ep) => ({
      ...this.endpointsService.toResponse(ep),
      latestCheck: latestMap.get(String(ep._id))
        ? (() => {
            const c = latestMap.get(String(ep._id))!;
            return {
              status: c.status,
              statusCode: c.statusCode,
              responseTimeMs: c.responseTimeMs,
              checkedAt: c.checkedAt,
            };
          })()
        : null,
    }));
  }

  @Get('uptime/:endpointId')
  async getUptime(
    @Param('orgId') orgId: string,
    @Param('endpointId') endpointId: string,
    @Query('hours') hours?: string,
  ) {
    await this.endpointsService.findOne(endpointId, orgId);
    const hoursBack = hours ? parseInt(hours, 10) : 24;
    return this.checkResultsService.getUptimePercent(
      endpointId,
      Math.min(Math.max(hoursBack, 1), 720),
    );
  }

  @Get('history/:endpointId')
  async getHistory(
    @Param('orgId') orgId: string,
    @Param('endpointId') endpointId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: CheckStatus,
  ) {
    await this.endpointsService.findOne(endpointId, orgId);
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.checkResultsService.getHistory(
      endpointId,
      limitNum,
      offsetNum,
      status,
    );
  }
}
