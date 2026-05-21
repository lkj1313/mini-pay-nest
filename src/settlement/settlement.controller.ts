import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Controller('settlements')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSettlement(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSettlementDto,
  ) {
    const totalAmount = BigInt(dto.totalAmount);
    return this.settlementService.createSettlement(
      user.userId,
      totalAmount,
      dto.type,
      dto.participantUserIds,
    );
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard)
  async paySettlement(
    @CurrentUser() user: { userId: string },
    @Param('id') settlementId: string,
  ) {
    return this.settlementService.paySettlement(user.userId, settlementId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMySettlements(@CurrentUser() user: { userId: string }) {
    return this.settlementService.findMySettlements(user.userId);
  }
}
