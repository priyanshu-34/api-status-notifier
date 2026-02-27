import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CheckResult,
  CheckResultDocument,
  CheckStatus,
} from './schemas/check-result.schema';
import { EndpointDocument } from '../endpoints/schemas/endpoint.schema';

export interface CreateCheckResultDto {
  endpointId: string;
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

@Injectable()
export class CheckResultsService {
  constructor(
    @InjectModel(CheckResult.name)
    private readonly checkResultModel: Model<CheckResultDocument>,
  ) {}

  async create(dto: CreateCheckResultDto): Promise<CheckResultDocument> {
    const result = new this.checkResultModel({
      ...dto,
      endpointId: new Types.ObjectId(dto.endpointId),
      checkedAt: new Date(),
    });
    return result.save();
  }

  async getLatestByEndpointId(
    endpointId: string,
  ): Promise<CheckResultDocument | null> {
    return this.checkResultModel
      .findOne({ endpointId: new Types.ObjectId(endpointId) })
      .sort({ checkedAt: -1 })
      .exec();
  }

  async getLatestForAllEndpoints(
    endpointIds: string[],
  ): Promise<Map<string, CheckResultDocument>> {
    if (endpointIds.length === 0) return new Map();
    const ids = endpointIds.map((id) => new Types.ObjectId(id));
    const results = await this.checkResultModel
      .aggregate<CheckResultDocument>([
        { $match: { endpointId: { $in: ids } } },
        { $sort: { endpointId: 1, checkedAt: -1 } },
        {
          $group: {
            _id: '$endpointId',
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
      ])
      .exec();
    const map = new Map<string, CheckResultDocument>();
    for (const r of results) {
      const id = (r.endpointId as Types.ObjectId).toString();
      map.set(id, r as CheckResultDocument);
    }
    return map;
  }

  async getHistory(
    endpointId: string,
    limit = 50,
    offset = 0,
    status?: CheckStatus,
  ): Promise<{ results: CheckResultDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      endpointId: new Types.ObjectId(endpointId),
    };
    if (status) filter.status = status;
    const [results, total] = await Promise.all([
      this.checkResultModel
        .find(filter)
        .sort({ checkedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.checkResultModel.countDocuments(filter).exec(),
    ]);
    return { results, total };
  }

  async getLastCheckedAt(endpoint: EndpointDocument): Promise<Date | null> {
    const last = await this.checkResultModel
      .findOne({ endpointId: endpoint._id })
      .sort({ checkedAt: -1 })
      .select('checkedAt')
      .lean()
      .exec();
    return last?.checkedAt ?? null;
  }

  async getUptimePercent(
    endpointId: string,
    hoursBack: number,
  ): Promise<{
    uptimePercent: number;
    totalChecks: number;
    upChecks: number;
  } | null> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const results = await this.checkResultModel
      .find({
        endpointId: new Types.ObjectId(endpointId),
        checkedAt: { $gte: since },
      })
      .select('status')
      .lean()
      .exec();
    if (results.length === 0) return null;
    const upChecks = results.filter((r) => r.status === 'up').length;
    return {
      uptimePercent: Math.round((upChecks / results.length) * 1000) / 10,
      totalChecks: results.length,
      upChecks,
    };
  }

  async getDigestStatsForEndpoints(
    endpointIds: string[],
    hoursBack: number,
  ): Promise<
    Map<
      string,
      { uptimePercent: number; totalChecks: number; avgResponseTimeMs: number }
    >
  > {
    if (endpointIds.length === 0) return new Map();
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const ids = endpointIds.map((id) => new Types.ObjectId(id));
    const results = await this.checkResultModel
      .aggregate<{
        _id: Types.ObjectId;
        total: number;
        upCount: number;
        avgMs: number;
      }>([
        {
          $match: {
            endpointId: { $in: ids },
            checkedAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$endpointId',
            total: { $sum: 1 },
            upCount: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
            avgMs: { $avg: '$responseTimeMs' },
          },
        },
      ])
      .exec();
    const map = new Map<
      string,
      { uptimePercent: number; totalChecks: number; avgResponseTimeMs: number }
    >();
    for (const r of results) {
      const id = r._id.toString();
      const uptimePercent =
        r.total > 0
          ? Math.round((r.upCount / r.total) * 1000) / 10
          : 0;
      map.set(id, {
        uptimePercent,
        totalChecks: r.total,
        avgResponseTimeMs: Math.round(r.avgMs ?? 0),
      });
    }
    return map;
  }
}
