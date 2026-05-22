import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { SavingsScheduler } from './savings.scheduler';

@Module({
  controllers: [AccountController],
  providers: [AccountService, SavingsScheduler],
})
export class AccountModule {}
