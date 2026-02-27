import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationsService } from '../../organizations/organizations.service';
import { OrgRole } from '../../memberships/schemas/membership.schema';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<OrgRole>(REQUIRE_ROLE_KEY, context.getHandler());
    if (!requiredRole) return true;
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const orgId = request.params?.orgId;
    if (!userId || !orgId) return false;
    try {
      await this.organizationsService.requireRole(orgId, userId, requiredRole);
      return true;
    } catch {
      return false;
    }
  }
}
