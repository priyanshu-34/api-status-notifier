import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orgs/:orgId/incidents')
@UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
export class OrgIncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @RequireRole('viewer')
  async list(
    @Param('orgId') orgId: string,
    @Query('status') status?: 'open' | 'resolved',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.incidentsService.findAll(orgId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      items: result.items.map((i) => ({
        id: String(i._id),
        title: i.title,
        description: i.description,
        status: i.status,
        startedAt: i.startedAt,
        resolvedAt: i.resolvedAt ?? null,
        resolvedBy: i.resolvedBy ? String(i.resolvedBy) : null,
        endpointIds: (i.endpointIds ?? []).map((e) => String(e)),
        resolveNote: i.resolveNote ?? null,
      })),
      total: result.total,
    };
  }

  @Post()
  @RequireRole('member')
  async create(
    @Param('orgId') orgId: string,
    @Body() body: { title?: string; description?: string; endpointIds?: string[] },
  ) {
    const incident = await this.incidentsService.create(orgId, {
      title: body.title ?? null,
      description: body.description ?? null,
      endpointIds: body.endpointIds ?? [],
    });
    return {
      id: String(incident._id),
      title: incident.title,
      description: incident.description,
      status: incident.status,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt ?? null,
      resolvedBy: incident.resolvedBy ? String(incident.resolvedBy) : null,
      endpointIds: (incident.endpointIds ?? []).map((e) => String(e)),
      resolveNote: incident.resolveNote ?? null,
    };
  }

  @Get(':id')
  @RequireRole('viewer')
  async getOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    const incident = await this.incidentsService.findOne(id, orgId);
    return {
      id: String(incident._id),
      title: incident.title,
      description: incident.description,
      status: incident.status,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt ?? null,
      resolvedBy: incident.resolvedBy ? String(incident.resolvedBy) : null,
      endpointIds: (incident.endpointIds ?? []).map((e) => String(e)),
      resolveNote: incident.resolveNote ?? null,
    };
  }

  @Patch(':id/resolve')
  @RequireRole('member')
  async resolve(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { note?: string },
  ) {
    const incident = await this.incidentsService.resolve(
      id,
      orgId,
      userId,
      body.note ?? null,
    );
    return {
      id: String(incident._id),
      title: incident.title,
      description: incident.description,
      status: incident.status,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt ?? null,
      resolvedBy: incident.resolvedBy ? String(incident.resolvedBy) : null,
      endpointIds: (incident.endpointIds ?? []).map((e) => String(e)),
      resolveNote: incident.resolveNote ?? null,
    };
  }
}
