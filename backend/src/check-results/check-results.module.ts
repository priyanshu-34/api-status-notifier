import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckResultsService } from './check-results.service';
import { CheckResult, CheckResultSchema } from './schemas/check-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckResult.name, schema: CheckResultSchema },
    ]),
  ],
  providers: [CheckResultsService],
  exports: [CheckResultsService],
})
export class CheckResultsModule {}
