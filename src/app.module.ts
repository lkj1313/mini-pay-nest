import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { AccountModule } from './account/account.module';
import { SettlementModule } from './settlement/settlement.module';
import { TransferRequestModule } from './transfer-request/transfer-request.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    AuthModule,
    RedisModule,
    AccountModule,
    SettlementModule,
    TransferRequestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
