import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export interface CreateAuditLogParams {
  organizationId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(params: CreateAuditLogParams): Promise<AuditLogDocument> {
    const doc = await this.auditLogModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      userId: new Types.ObjectId(params.userId),
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ?? null,
    });
    return doc;
  }

  async findForOrg(
    organizationId: string,
    filters: AuditLogFilters = {},
    limit = 50,
    offset = 0,
  ): Promise<{
    items: Array<{
      _id: unknown;
      userId: unknown;
      action: string;
      resourceType: string;
      resourceId: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const query: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (filters.action) query.action = filters.action;
    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) (query.createdAt as Record<string, Date>).$gte = new Date(filters.from);
      if (filters.to) (query.createdAt as Record<string, Date>).$lte = new Date(filters.to);
    }
    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('userId', 'email name')
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }
}
