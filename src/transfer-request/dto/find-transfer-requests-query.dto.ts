import { IsEnum, IsOptional } from 'class-validator';
import { TransferRequestStatus } from '@prisma/client';

export class FindTransferRequestsQueryDto {
  @IsOptional()
  @IsEnum(TransferRequestStatus, {
    message:
      'status는 PENDING, ACCEPTED, REJECTED, EXPIRED, CANCELLED 중 하나여야 합니다.',
  })
  status?: TransferRequestStatus;
}
