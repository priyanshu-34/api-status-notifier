import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationChannel = 'email' | 'webhook';
export type NotificationReason = 'down' | 'slow' | 'sla_breach';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ id: true, toJSON: { virtuals: true } })
export class NotificationLog {
  @Prop({ type: Types.ObjectId, ref: 'Endpoint', required: true })
  endpointId: Types.ObjectId;

  @Prop({ required: true, enum: ['email', 'webhook'] })
  channel: NotificationChannel;

  @Prop({ required: true, enum: ['down', 'slow', 'sla_breach'] })
  reason: NotificationReason;

  @Prop({ default: null })
  target: string | null;

  @Prop({ required: true, default: () => new Date() })
  sentAt: Date;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);
NotificationLogSchema.virtual('id').get(function () {
  return this._id?.toString();
});
