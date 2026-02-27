import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const orgId = request.params?.orgId;
    if (!userId || !orgId) return false;
    try {
      const membership = await this.organizationsService.requireMembership(orgId, userId);
      request.membership = membership;
      request.orgId = orgId;
      return true;
    } catch {
      return false;
    }
  }
}
