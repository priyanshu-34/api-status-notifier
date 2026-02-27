import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Endpoint, EndpointDocument } from './schemas/endpoint.schema';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';

export const MASKED_SECRET_PLACEHOLDER = '********';

@Injectable()
export class EndpointsService {
  constructor(
    @InjectModel(Endpoint.name)
    private readonly endpointModel: Model<EndpointDocument>,
  ) {}

  toResponse(ep: EndpointDocument): Record<string, unknown> {
    const json = ep.toJSON ? ep.toJSON() : (ep as unknown as Record<string, unknown>);
    const out = { ...json, id: String(ep._id) };
    (out as Record<string, unknown>).authPassword =
      ep.authPassword ? MASKED_SECRET_PLACEHOLDER : undefined;
    (out as Record<string, unknown>).authBearerToken =
      ep.authBearerToken ? MASKED_SECRET_PLACEHOLDER : undefined;
    return out;
  }

  async create(organizationId: string, dto: CreateEndpointDto): Promise<EndpointDocument> {
    const endpoint = new this.endpointModel({
      ...dto,
      organizationId: new Types.ObjectId(organizationId),
      authType: dto.authType ?? 'none',
    });
    return endpoint.save();
  }

  async findAll(
    organizationId: string,
    options?: { tag?: string },
  ): Promise<EndpointDocument[]> {
    const query: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (options?.tag?.trim()) {
      query.tags = options.tag.trim();
    }
    return this.endpointModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, organizationId: string): Promise<EndpointDocument> {
    const endpoint = await this.endpointModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();
    if (!endpoint) throw new NotFoundException(`Endpoint ${id} not found`);
    return endpoint;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateEndpointDto,
  ): Promise<EndpointDocument> {
    const endpoint = await this.findOne(id, organizationId);
    const {
      maintenanceUntil,
      authPassword: dtoPassword,
      authBearerToken: dtoToken,
      ...rest
    } = dto;
    endpoint.set(rest);
    if (maintenanceUntil !== undefined) {
      endpoint.maintenanceUntil =
        maintenanceUntil == null || maintenanceUntil === ''
          ? null
          : new Date(maintenanceUntil);
    }
    if (dto.authType === 'none') {
      endpoint.authUsername = undefined;
      endpoint.authPassword = undefined;
      endpoint.authBearerToken = undefined;
    } else {
      if (
        dtoPassword !== undefined &&
        dtoPassword !== null &&
        dtoPassword !== MASKED_SECRET_PLACEHOLDER
      ) {
        endpoint.authPassword = dtoPassword;
      }
      if (
        dtoToken !== undefined &&
        dtoToken !== null &&
        dtoToken !== MASKED_SECRET_PLACEHOLDER
      ) {
        endpoint.authBearerToken = dtoToken;
      }
    }
    return endpoint.save();
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const endpoint = await this.findOne(id, organizationId);
    await endpoint.deleteOne();
  }

  async findAllForScheduler(): Promise<EndpointDocument[]> {
    return this.endpointModel.find().sort({ createdAt: -1 }).exec();
  }
}
