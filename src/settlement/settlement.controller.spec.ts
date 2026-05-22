import { Test, TestingModule } from '@nestjs/testing';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';

describe('SettlementController', () => {
  let controller: SettlementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [SettlementService],
    }).compile();

    controller = module.get<SettlementController>(SettlementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
