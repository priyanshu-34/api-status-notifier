import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EndpointDocument = Endpoint & Document;

export type AuthType = 'none' | 'basic' | 'bearer';

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class Endpoint {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: 'GET' })
  method: string;

  @Prop({ default: 200 })
  expectedStatus: number;

  @Prop({ default: 10000 })
  timeoutMs: number;

  @Prop({ default: 5000 })
  slowThresholdMs: number;

  @Prop({ default: 5 })
  checkIntervalMinutes: number;

  @Prop({ default: null })
  maintenanceUntil: Date | null;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: null })
  slaTargetPercent: number | null;

  @Prop({ default: 30 })
  slaWindowDays: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  headers: Record<string, string> | null;

  @Prop({ default: 'none', enum: ['none', 'basic', 'bearer'] })
  authType: AuthType;

  @Prop({ default: null })
  authUsername: string | null;

  @Prop({ default: null })
  authPassword: string | null;

  @Prop({ default: null })
  authBearerToken: string | null;
}

export const EndpointSchema = SchemaFactory.createForClass(Endpoint);
EndpointSchema.virtual('id').get(function () {
  return this._id?.toString();
});
