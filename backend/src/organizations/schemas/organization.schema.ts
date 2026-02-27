import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class Organization {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  slug: string | null;

  @Prop({ default: false })
  statusPageEnabled: boolean;

  /** Custom title for the public status page (e.g. "Acme API Status"). Falls back to name if empty. */
  @Prop({ default: null })
  statusPageTitle: string | null;

  /** IANA timezone (e.g. "America/New_York") for digest and reports. */
  @Prop({ default: null })
  timezone: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.virtual('id').get(function () {
  return this._id?.toString();
});
