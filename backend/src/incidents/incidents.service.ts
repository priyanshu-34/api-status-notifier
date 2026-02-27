import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Incident, IncidentDocument } from './incident.schema';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name)
    private readonly incidentModel: Model<IncidentDocument>,
  ) {}

  async create(
    organizationId: string,
    data: {
      title?: string | null;
      description?: string | null;
      endpointIds?: string[];
    },
  ): Promise<IncidentDocument> {
    const doc = await this.incidentModel.create({
      organizationId: new Types.ObjectId(organizationId),
      title: data.title ?? null,
      description: data.description ?? null,
      status: 'open',
      startedAt: new Date(),
      endpointIds: (data.endpointIds ?? []).map((id) => new Types.ObjectId(id)),
    });
    return doc;
  }

  async findAll(
    organizationId: string,
    options?: { status?: 'open' | 'resolved'; limit?: number; offset?: number },
  ): Promise<{ items: IncidentDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (options?.status) query.status = options.status;
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;
    const [items, total] = await Promise.all([
      this.incidentModel
        .find(query)
        .sort({ startedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.incidentModel.countDocuments(query).exec(),
    ]);
    return { items: items as IncidentDocument[], total };
  }

  async findOne(id: string, organizationId: string): Promise<IncidentDocument> {
    const incident = await this.incidentModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();
    if (!incident) throw new NotFoundException(`Incident ${id} not found`);
    return incident;
  }

  async resolve(
    id: string,
    organizationId: string,
    userId: string,
    note?: string | null,
  ): Promise<IncidentDocument> {
    const incident = await this.findOne(id, organizationId);
    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolvedBy = new Types.ObjectId(userId);
    incident.resolveNote = note ?? null;
    return incident.save();
  }

  async findSince(
    organizationId: string,
    since: Date,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      title: string | null;
      description: string | null;
      status: string;
      startedAt: Date;
      resolvedAt: Date | null;
      resolveNote: string | null;
    }>
  > {
    const items = await this.incidentModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        startedAt: { $gte: since },
      })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return items.map((i) => ({
      id: String(i._id),
      title: i.title ?? null,
      description: i.description ?? null,
      status: i.status,
      startedAt: i.startedAt,
      resolvedAt: i.resolvedAt ?? null,
      resolveNote: i.resolveNote ?? null,
    }));
  }

  async findRecentForOrg(
    organizationId: string,
    limit = 10,
  ): Promise<Array<{ id: string; title: string | null; description: string | null; status: string; startedAt: Date; resolvedAt: Date | null; resolveNote: string | null }>> {
    const items = await this.incidentModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return items.map((i) => ({
      id: String(i._id),
      title: i.title ?? null,
      description: i.description ?? null,
      status: i.status,
      startedAt: i.startedAt,
      resolvedAt: i.resolvedAt ?? null,
      resolveNote: i.resolveNote ?? null,
    }));
  }
}
