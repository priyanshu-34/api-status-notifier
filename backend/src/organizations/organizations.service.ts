import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { Membership, MembershipDocument, OrgRole } from '../memberships/schemas/membership.schema';

export interface OrgWithRole {
  id: string;
  name: string;
  slug: string | null;
  role: OrgRole;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findAllForUser(userId: string): Promise<OrgWithRole[]> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate<{ organizationId: OrganizationDocument }>('organizationId')
      .lean()
      .exec();
    return memberships
      .filter((m) => m.organizationId)
      .map((m) => ({
        id: (m.organizationId as OrganizationDocument)._id.toString(),
        name: (m.organizationId as OrganizationDocument).name,
        slug: (m.organizationId as OrganizationDocument).slug ?? null,
        role: m.role as OrgRole,
      }));
  }

  async create(userId: string, dto: { name: string; slug?: string }): Promise<OrganizationDocument> {
    const slug = dto.slug?.trim() || null;
    if (slug) {
      const existing = await this.orgModel.findOne({ slug }).exec();
      if (existing) throw new ForbiddenException('Organization with this slug already exists');
    }
    const org = await this.orgModel.create({
      name: dto.name,
      slug: slug || null,
      createdBy: new Types.ObjectId(userId),
    });
    await this.membershipModel.create({
      userId: new Types.ObjectId(userId),
      organizationId: org._id,
      role: 'admin',
    });
    return org;
  }

  async findOne(orgId: string, userId: string): Promise<OrganizationDocument> {
    await this.requireMembership(orgId, userId);
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(
    orgId: string,
    userId: string,
    dto: {
      name?: string;
      slug?: string;
      statusPageEnabled?: boolean;
      statusPageTitle?: string | null;
      timezone?: string | null;
    },
  ): Promise<OrganizationDocument> {
    await this.requireRole(orgId, userId, 'admin');
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    if (dto.name != null) org.name = dto.name;
    if (dto.slug !== undefined) org.slug = dto.slug?.trim() || null;
    if (dto.statusPageEnabled !== undefined) org.statusPageEnabled = dto.statusPageEnabled;
    if (dto.statusPageTitle !== undefined) org.statusPageTitle = dto.statusPageTitle?.trim() || null;
    if (dto.timezone !== undefined) org.timezone = dto.timezone?.trim() || null;
    await org.save();
    return org;
  }

  async findById(orgId: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findById(orgId).exec();
  }

  async findOneBySlugForPublicStatus(slug: string): Promise<OrganizationDocument | null> {
    const org = await this.orgModel
      .findOne({ slug: slug.trim(), statusPageEnabled: true })
      .exec();
    return org ?? null;
  }

  async requireMembership(orgId: string, userId: string): Promise<MembershipDocument> {
    const membership = await this.membershipModel
      .findOne({ organizationId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) })
      .exec();
    if (!membership) throw new ForbiddenException('You are not a member of this organization');
    return membership;
  }

  async requireRole(orgId: string, userId: string, minRole: OrgRole): Promise<MembershipDocument> {
    const membership = await this.requireMembership(orgId, userId);
    const order: OrgRole[] = ['viewer', 'member', 'admin'];
    if (order.indexOf(membership.role) < order.indexOf(minRole)) {
      throw new ForbiddenException('Insufficient role');
    }
    return membership;
  }

  /** Delete organization and all related data. Admin only. */
  async delete(orgId: string, userId: string): Promise<void> {
    await this.requireRole(orgId, userId, 'admin');
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    const oid = new Types.ObjectId(orgId);

    const endpointIds = await this.connection
      .model('Endpoint')
      .find({ organizationId: oid }, { _id: 1 })
      .lean()
      .then((docs) => docs.map((d) => d._id));

    await this.connection.model('NotificationLog').deleteMany({ endpointId: { $in: endpointIds } }).exec();
    await this.connection.model('CheckResult').deleteMany({ endpointId: { $in: endpointIds } }).exec();
    await this.connection.model('Endpoint').deleteMany({ organizationId: oid }).exec();
    await this.connection.model('NotificationConfig').deleteMany({ organizationId: oid }).exec();
    await this.connection.model('Incident').deleteMany({ organizationId: oid }).exec();
    await this.connection.model('AuditLog').deleteMany({ organizationId: oid }).exec();
    await this.connection.model('Invitation').deleteMany({ organizationId: oid }).exec();
    await this.membershipModel.deleteMany({ organizationId: oid }).exec();
    await this.orgModel.findByIdAndDelete(orgId).exec();
  }
}
