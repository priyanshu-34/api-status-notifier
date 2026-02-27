import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CheckStatus = 'up' | 'down' | 'slow';

export type CheckResultDocument = CheckResult & Document;

@Schema({ id: true, toJSON: { virtuals: true } })
export class CheckResult {
  @Prop({ type: Types.ObjectId, ref: 'Endpoint', required: true })
  endpointId: Types.ObjectId;

  @Prop({ required: true, enum: ['up', 'down', 'slow'] })
  status: CheckStatus;

  @Prop({ default: null })
  statusCode: number | null;

  @Prop({ default: null })
  responseTimeMs: number | null;

  @Prop({ default: null })
  errorMessage: string | null;

  @Prop({ required: true, default: () => new Date() })
  checkedAt: Date;
}

export const CheckResultSchema = SchemaFactory.createForClass(CheckResult);
CheckResultSchema.virtual('id').get(function () {
  return this._id?.toString();
});
CheckResultSchema.index({ endpointId: 1, checkedAt: -1 });
