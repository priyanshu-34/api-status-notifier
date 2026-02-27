import {
  IsString,
  IsUrl,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsObject,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export type AuthTypeDto = 'none' | 'basic' | 'bearer';

export class UpdateEndpointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatus?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(60000)
  slowThresholdMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  checkIntervalMinutes?: number;

  @IsOptional()
  @IsDateString()
  maintenanceUntil?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(90)
  @Max(100)
  slaTargetPercent?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  slaWindowDays?: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string> | null;

  @IsOptional()
  @IsEnum(['none', 'basic', 'bearer'])
  authType?: 'none' | 'basic' | 'bearer';

  @IsOptional()
  @ValidateIf((o) => o.authType === 'basic')
  @IsString()
  authUsername?: string | null;

  @IsOptional()
  @IsString()
  authPassword?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.authType === 'bearer')
  @IsString()
  authBearerToken?: string | null;
}
