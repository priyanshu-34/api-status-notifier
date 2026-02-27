import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inviterId: Types.ObjectId;

  @Prop({ required: true })
  inviteeEmail: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, enum: ['admin', 'member', 'viewer'] })
  role: 'admin' | 'member' | 'viewer';

  @Prop({ required: true, enum: ['pending', 'accepted', 'expired', 'cancelled'], default: 'pending' })
  status: InvitationStatus;

  @Prop({ default: null })
  expiresAt: Date | null;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.virtual('id').get(function () {
  return this._id?.toString();
});
InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ organizationId: 1, inviteeEmail: 1, status: 1 });
