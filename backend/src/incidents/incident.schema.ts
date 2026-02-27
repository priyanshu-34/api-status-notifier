import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IncidentDocument = Incident & Document;

@Schema({ timestamps: true, id: true, toJSON: { virtuals: true } })
export class Incident {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ default: null })
  title: string | null;

  @Prop({ default: null })
  description: string | null;

  @Prop({ required: true, enum: ['open', 'resolved'], default: 'open' })
  status: 'open' | 'resolved';

  @Prop({ required: true, default: () => new Date() })
  startedAt: Date;

  @Prop({ default: null })
  resolvedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: 'Endpoint', default: [] })
  endpointIds: Types.ObjectId[];

  @Prop({ default: null })
  resolveNote: string | null;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);
IncidentSchema.index({ organizationId: 1, startedAt: -1 });
IncidentSchema.virtual('id').get(function () {
  return this._id?.toString();
});
