import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationConfigDocument = NotificationConfig & Document;

const WebhookTargetSchema = new MongooseSchema(
  {
    url: { type: String, required: true },
    label: { type: String, default: null },
    /** Endpoint IDs this webhook receives alerts for. Empty or missing = all endpoints. */
    endpointIds: { type: [String], default: undefined },
  },
  { _id: false },
);

const EmailTargetSchema = new MongooseSchema(
  {
    email: { type: String, required: true },
    /** Endpoint IDs this email receives alerts for. Empty or missing = all endpoints. */
    endpointIds: { type: [String], default: undefined },
  },
  { _id: false },
);

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class NotificationConfig {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  /** @deprecated Use emails instead */
  @Prop({ default: null })
  email: string | null;

  /** @deprecated Use webhooks instead */
  @Prop({ default: null })
  webhookUrl: string | null;

  @Prop({ type: [String], default: [] })
  emails: string[];

  /** Email targets with optional per-endpoint scoping. Takes precedence over emails when set. */
  @Prop({ type: [EmailTargetSchema], default: undefined })
  emailTargets?: Array<{ email: string; endpointIds?: string[] }>;

  @Prop({ type: [WebhookTargetSchema], default: [] })
  webhooks: Array<{ url: string; label?: string | null; endpointIds?: string[] }>;

  @Prop({ default: true })
  notifyOnDown: boolean;

  @Prop({ default: true })
  notifyOnSlow: boolean;

  @Prop({ default: 15 })
  cooldownMinutes: number;

  @Prop({ default: false })
  digestEnabled: boolean;

  @Prop({ default: 'weekly', enum: ['daily', 'weekly'] })
  digestFrequency: 'daily' | 'weekly';

  @Prop({ default: 1 })
  digestDayOfWeek: number;
}

export const NotificationConfigSchema =
  SchemaFactory.createForClass(NotificationConfig);
NotificationConfigSchema.virtual('id').get(function () {
  return this._id?.toString();
});
