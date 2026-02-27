import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EndpointsService } from './endpoints.service';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('orgs/:orgId/endpoints')
@UseGuards(JwtAuthGuard, OrgMemberGuard, RolesGuard)
@RequireRole('member')
export class OrgEndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEndpointDto,
  ) {
    const ep = await this.endpointsService.create(orgId, dto);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'endpoint.created',
      resourceType: 'endpoint',
      resourceId: String(ep._id),
      metadata: { name: ep.name, url: ep.url },
    });
    return this.endpointsService.toResponse(ep);
  }

  @Get()
  async findAll(
    @Param('orgId') orgId: string,
    @Query('tag') tag?: string,
  ) {
    const list = await this.endpointsService.findAll(
      orgId,
      tag ? { tag } : undefined,
    );
    return list.map((ep) => this.endpointsService.toResponse(ep));
  }

  @Get(':id')
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    const ep = await this.endpointsService.findOne(id, orgId);
    return this.endpointsService.toResponse(ep);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    const ep = await this.endpointsService.update(id, orgId, dto);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'endpoint.updated',
      resourceType: 'endpoint',
      resourceId: id,
      metadata: { name: ep.name },
    });
    return this.endpointsService.toResponse(ep);
  }

  @Delete(':id')
  async remove(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.endpointsService.remove(id, orgId);
    await this.auditLogService.create({
      organizationId: orgId,
      userId,
      action: 'endpoint.removed',
      resourceType: 'endpoint',
      resourceId: id,
    });
  }
}
