import { Module } from '@nestjs/common';
import { TransferRequestService } from './transfer-request.service';
import { TransferRequestController } from './transfer-request.controller';
import { TransferRequestScheduler } from './transfer-request.scheduler';

@Module({
  controllers: [TransferRequestController],
  providers: [TransferRequestService, TransferRequestScheduler],
})
export class TransferRequestModule {}
