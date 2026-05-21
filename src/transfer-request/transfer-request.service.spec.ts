import { Test, TestingModule } from '@nestjs/testing';
import { TransferRequestService } from './transfer-request.service';

describe('TransferRequestService', () => {
  let service: TransferRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransferRequestService],
    }).compile();

    service = module.get<TransferRequestService>(TransferRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
