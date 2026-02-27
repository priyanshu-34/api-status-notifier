import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrgRole = 'admin' | 'member' | 'viewer';

export type MembershipDocument = Membership & Document;

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class Membership {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'member', 'viewer'] })
  role: OrgRole;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.virtual('id').get(function () {
  return this._id?.toString();
});
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
