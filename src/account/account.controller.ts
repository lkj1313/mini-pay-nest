import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChargeMainAccountDto } from './dto/charge-main-account.dto';
import { DepositToSavingsDto } from './dto/deposit-to-savings.dto';
import { TransferToUserDto } from './dto/transfer-to-user.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMyAccounts(@CurrentUser() user: { userId: string }) {
    return this.accountService.findMyAccounts(user.userId);
  }

  @Post('savings')
  @UseGuards(JwtAuthGuard)
  async createSavingsAccount(@CurrentUser() user: { userId: string }) {
    return this.accountService.createSavingsAccount(user.userId);
  }

  @Post('main/charge')
  @UseGuards(JwtAuthGuard)
  async chargeMainAccount(
    @CurrentUser() user: { userId: string },
    @Body() dto: ChargeMainAccountDto,
  ) {
    const amount = BigInt(dto.amount);
    return this.accountService.chargeMainAccount(user.userId, amount);
  }

  @Post('savings/:id/deposit')
  @UseGuards(JwtAuthGuard)
  async depositToSavings(
    @CurrentUser() user: { userId: string },
    @Param('id') savingsAccountId: string,
    @Body() dto: DepositToSavingsDto,
  ) {
    const amount = BigInt(dto.amount);
    return this.accountService.depositToSavings(
      user.userId,
      savingsAccountId,
      amount,
    );
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  async transferToUser(
    @CurrentUser() user: { userId: string },
    @Body() dto: TransferToUserDto,
  ) {
    const amount = BigInt(dto.amount);
    return this.accountService.transferToUser(
      user.userId,
      dto.recipientAccountId,
      amount,
      dto.mode,
    );
  }

  @Get(':accountId/transactions')
  @UseGuards(JwtAuthGuard)
  async findTransactions(
    @CurrentUser() user: { userId: string },
    @Param('accountId') accountId: string,
  ) {
    return this.accountService.findTransactionsByAccountId(
      user.userId,
      accountId,
    );
  }
}
