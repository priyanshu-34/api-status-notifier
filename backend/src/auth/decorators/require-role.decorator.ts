import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '../../memberships/schemas/membership.schema';

export const REQUIRE_ROLE_KEY = 'requireRole';

export const RequireRole = (role: OrgRole) => SetMetadata(REQUIRE_ROLE_KEY, role);
