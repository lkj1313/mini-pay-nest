import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { AccountModule } from './account/account.module';
import { SettlementModule } from './settlement/settlement.module';

@Module({
  imports: [PrismaModule, UserModule, AuthModule, RedisModule, AccountModule, SettlementModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
