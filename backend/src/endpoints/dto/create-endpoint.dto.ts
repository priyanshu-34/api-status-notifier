import {
  IsString,
  IsUrl,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsObject,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export type AuthTypeDto = 'none' | 'basic' | 'bearer';

export class CreateEndpointDto {
  @IsString()
  name: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  method?: string = 'GET';

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatus?: number = 200;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number = 10000;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(60000)
  slowThresholdMs?: number = 5000;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  checkIntervalMinutes?: number = 5;

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
  headers?: Record<string, string>;

  @IsOptional()
  @IsEnum(['none', 'basic', 'bearer'])
  authType?: AuthTypeDto = 'none';

  @IsOptional()
  @ValidateIf((o) => o.authType === 'basic')
  @IsString()
  authUsername?: string;

  @IsOptional()
  @IsString()
  authPassword?: string;

  @IsOptional()
  @ValidateIf((o) => o.authType === 'bearer')
  @IsString()
  authBearerToken?: string;
}
