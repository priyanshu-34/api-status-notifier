import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CheckResultsService } from '../check-results/check-results.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { IncidentsService } from '../incidents/incidents.service';

@Controller('public/status')
export class PublicStatusController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly endpointsService: EndpointsService,
    private readonly checkResultsService: CheckResultsService,
    private readonly incidentsService: IncidentsService,
  ) {}

  @Get(':orgSlug')
  async getPublicStatus(@Param('orgSlug') orgSlug: string) {
    const org = await this.organizationsService.findOneBySlugForPublicStatus(orgSlug);
    if (!org) throw new NotFoundException('Status page not found');
    const orgId = String(org._id);
    const endpoints = await this.endpointsService.findAll(orgId);
    const endpointIds = endpoints.map((e) => String(e._id));
    const latestMap = await this.checkResultsService.getLatestForAllEndpoints(endpointIds);
    const uptime24h = await Promise.all(
      endpointIds.map(async (id) => {
        const u = await this.checkResultsService.getUptimePercent(id, 24);
        return { endpointId: id, uptimePercent: u?.uptimePercent ?? null };
      }),
    );
    const uptimeMap = new Map(uptime24h.map((u) => [u.endpointId, u.uptimePercent]));
    const now = new Date();
    const services = endpoints.map((ep) => {
      const id = String(ep._id);
      const latest = latestMap.get(id);
      const inMaintenance =
        ep.maintenanceUntil && ep.maintenanceUntil > now;
      return {
        id,
        name: ep.name,
        status: inMaintenance ? 'maintenance' : (latest?.status ?? 'unknown'),
        statusCode: latest?.statusCode ?? null,
        responseTimeMs: latest?.responseTimeMs ?? null,
        checkedAt: latest?.checkedAt ?? null,
        uptime24h: uptimeMap.get(id) ?? null,
        maintenanceUntil: ep.maintenanceUntil ?? null,
      };
    });
    const anyDown = services.some((s) => s.status === 'down');
    const anySlow = services.some((s) => s.status === 'slow');
    const overallStatus = anyDown ? 'major_outage' : anySlow ? 'partial_outage' : 'operational';
    const incidents = await this.incidentsService.findRecentForOrg(orgId, 10);
    return {
      orgName: org.statusPageTitle?.trim() || org.name,
      slug: org.slug,
      overallStatus,
      services,
      incidents: incidents.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        status: i.status,
        startedAt: i.startedAt,
        resolvedAt: i.resolvedAt,
        resolveNote: i.resolveNote,
      })),
    };
  }
}
