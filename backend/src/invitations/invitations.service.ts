import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  Invitation,
  InvitationDocument,
  InvitationStatus,
} from './schemas/invitation.schema';
import { Membership, MembershipDocument, OrgRole } from '../memberships/schemas/membership.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { OrganizationsService } from '../organizations/organizations.service';

const INVITATION_EXPIRY_DAYS = 7;

export interface InvitationInfo {
  id: string;
  orgId: string;
  orgName: string;
  inviterEmail: string;
  inviteeEmail: string;
  role: OrgRole;
  status: InvitationStatus;
  canAccept: boolean;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(
    orgId: string,
    adminUserId: string,
    email: string,
    role: OrgRole,
  ): Promise<InvitationDocument> {
    await this.organizationsService.requireRole(orgId, adminUserId, 'admin');
    const normalized = email.trim().toLowerCase();
    const existingUser = await this.userModel.findOne({ email: normalized }).select('_id').exec();
    if (existingUser) {
      const existingMember = await this.membershipModel
        .findOne({
          organizationId: new Types.ObjectId(orgId),
          userId: existingUser._id,
        })
        .exec();
      if (existingMember) {
        throw new BadRequestException('User is already a member of this organization');
      }
    }
    const existingPending = await this.invitationModel
      .findOne({
        organizationId: new Types.ObjectId(orgId),
        inviteeEmail: normalized,
        status: 'pending',
      })
      .exec();
    if (existingPending) {
      throw new BadRequestException('An invitation for this email is already pending');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    const invitation = await this.invitationModel.create({
      organizationId: new Types.ObjectId(orgId),
      inviterId: new Types.ObjectId(adminUserId),
      inviteeEmail: normalized,
      token,
      role,
      status: 'pending',
      expiresAt,
    });
    await this.sendInvitationEmail(invitation);
    return invitation;
  }

  async getByToken(token: string, currentUserEmail?: string | null): Promise<InvitationInfo | null> {
    const inv = await this.invitationModel
      .findOne({ token, status: 'pending' })
      .populate<{ organizationId: OrganizationDocument; inviterId: UserDocument }>([
        'organizationId',
        'inviterId',
      ])
      .lean()
      .exec();
    if (!inv) return null;
    const org = inv.organizationId as OrganizationDocument;
    const inviter = inv.inviterId as UserDocument;
    const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
    if (expired) {
      await this.invitationModel.updateOne(
        { _id: inv._id },
        { $set: { status: 'expired' } },
      );
      return null;
    }
    const canAccept =
      !!currentUserEmail &&
      currentUserEmail.toLowerCase() === (inv.inviteeEmail as string).toLowerCase();
    return {
      id: (inv as { _id: Types.ObjectId })._id.toString(),
      orgId: org._id.toString(),
      orgName: org.name,
      inviterEmail: inviter?.email ?? '',
      inviteeEmail: inv.inviteeEmail,
      role: inv.role as OrgRole,
      status: inv.status as InvitationStatus,
      canAccept,
    };
  }

  async accept(token: string, userId: string): Promise<{ orgId: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new ForbiddenException('User not found');
    const inv = await this.invitationModel
      .findOne({ token, status: 'pending' })
      .exec();
    if (!inv) throw new NotFoundException('Invitation not found or no longer valid');
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      inv.status = 'expired';
      await inv.save();
      throw new BadRequestException('Invitation has expired');
    }
    if (user.email.toLowerCase() !== inv.inviteeEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }
    const existing = await this.membershipModel
      .findOne({
        organizationId: inv.organizationId,
        userId: user._id,
      })
      .exec();
    if (existing) {
      inv.status = 'accepted';
      await inv.save();
      return { orgId: inv.organizationId.toString() };
    }
    await this.membershipModel.create({
      organizationId: inv.organizationId,
      userId: user._id,
      role: inv.role,
    });
    inv.status = 'accepted';
    await inv.save();
    return { orgId: inv.organizationId.toString() };
  }

  async listPending(orgId: string, userId: string): Promise<Array<{
    id: string;
    inviteeEmail: string;
    role: OrgRole;
    inviterEmail: string;
    createdAt: string;
  }>> {
    await this.organizationsService.requireRole(orgId, userId, 'admin');
    const list = await this.invitationModel
      .find({ organizationId: new Types.ObjectId(orgId), status: 'pending' })
      .populate<{ inviterId: UserDocument }>('inviterId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return list
      .filter((inv) => {
        const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
        return !exp || exp > new Date();
      })
      .map((inv) => ({
        id: (inv as { _id: Types.ObjectId })._id.toString(),
        inviteeEmail: inv.inviteeEmail,
        role: inv.role as OrgRole,
        inviterEmail: (inv.inviterId as UserDocument)?.email ?? '',
        createdAt: (inv as { createdAt?: Date }).createdAt?.toISOString() ?? '',
      }));
  }

  async cancel(orgId: string, invitationId: string, userId: string): Promise<void> {
    await this.organizationsService.requireRole(orgId, userId, 'admin');
    const inv = await this.invitationModel
      .findOne({
        _id: new Types.ObjectId(invitationId),
        organizationId: new Types.ObjectId(orgId),
        status: 'pending',
      })
      .exec();
    if (!inv) throw new NotFoundException('Invitation not found or already used');
    inv.status = 'cancelled';
    await inv.save();
  }

  private async sendInvitationEmail(invitation: InvitationDocument): Promise<void> {
    const enableEmail =
      this.config.get<string>('ENABLE_EMAIL_NOTIFICATIONS', 'false') === 'true';
    if (!enableEmail) return;
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL', '').replace(/\/$/, '') ||
      'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/invite/${invitation.token}`;
    const org = await this.orgModel.findById(invitation.organizationId).exec();
    const orgName = org?.name ?? 'Organization';
    const transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
    const subject = `You're invited to join ${orgName}`;
    const text = `You have been invited to join "${orgName}" on API Status Notifier.\n\nAccept the invitation by visiting:\n${inviteUrl}\n\nThis link expires in ${INVITATION_EXPIRY_DAYS} days.`;
    await transporter.sendMail({
      from: this.config.get('SMTP_USER', 'noreply@localhost'),
      to: invitation.inviteeEmail,
      subject,
      text,
    });
  }
}
