import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Membership, MembershipDocument, OrgRole } from '../memberships/schemas/membership.schema';
import { OrganizationsService } from './organizations.service';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async findAll(orgId: string, userId: string): Promise<Array<{ userId: string; email: string; name: string | null; role: OrgRole }>> {
    await this.organizationsService.requireRole(orgId, userId, 'admin');
    const memberships = await this.membershipModel
      .find({ organizationId: new Types.ObjectId(orgId) })
      .populate<{ userId: UserDocument }>('userId')
      .lean()
      .exec();
    return memberships
      .filter((m) => m.userId)
      .map((m) => ({
        userId: (m.userId as UserDocument)._id.toString(),
        email: (m.userId as UserDocument).email,
        name: (m.userId as UserDocument).name ?? null,
        role: m.role as OrgRole,
      }));
  }

  async addMember(orgId: string, userId: string, email: string, role: OrgRole): Promise<MembershipDocument> {
    await this.organizationsService.requireRole(orgId, userId, 'admin');
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    if (!user) throw new NotFoundException('User with this email not found');
    const existing = await this.membershipModel
      .findOne({ organizationId: new Types.ObjectId(orgId), userId: user._id })
      .exec();
    if (existing) throw new ForbiddenException('User is already a member');
    return this.membershipModel.create({
      organizationId: new Types.ObjectId(orgId),
      userId: user._id,
      role,
    });
  }

  async updateMember(
    orgId: string,
    userId: string,
    targetUserId: string,
    update: { role?: OrgRole } | null,
  ): Promise<void> {
    await this.organizationsService.requireRole(orgId, userId, 'admin');
    const membership = await this.membershipModel
      .findOne({
        organizationId: new Types.ObjectId(orgId),
        userId: new Types.ObjectId(targetUserId),
      })
      .exec();
    if (!membership) throw new NotFoundException('Member not found');
    if (update === null) {
      await membership.deleteOne();
      return;
    }
    if (update.role != null) {
      membership.role = update.role;
      await membership.save();
    }
  }
}
