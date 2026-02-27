import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly invitationsService: InvitationsService,
  ) {}

  async register(dto: RegisterDto): Promise<{
    access_token: string;
    user: { id: string; email: string; name: string | null };
    joinedOrgId?: string;
  }> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      password: hashed,
      name: dto.name ?? null,
    });
    let joinedOrgId: string | undefined;
    if (dto.inviteToken?.trim()) {
      try {
        const result = await this.invitationsService.accept(
          dto.inviteToken.trim(),
          user._id.toString(),
        );
        joinedOrgId = result.orgId;
      } catch {
        // Ignore invalid/expired invite; user is still registered
      }
    }
    const token = this.jwtService.sign({ sub: user._id.toString(), email: user.email });
    const res: {
      access_token: string;
      user: { id: string; email: string; name: string | null };
      joinedOrgId?: string;
    } = {
      access_token: token,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    };
    if (joinedOrgId) res.joinedOrgId = joinedOrgId;
    return res;
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return user;
  }

  async login(dto: LoginDto): Promise<{ access_token: string; user: { id: string; email: string; name: string | null } }> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const token = this.jwtService.sign({ sub: user._id.toString(), email: user.email });
    return {
      access_token: token,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    };
  }
}
