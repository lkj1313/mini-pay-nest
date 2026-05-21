import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransferRequestService } from './transfer-request.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FindTransferRequestsQueryDto } from './dto/find-transfer-requests-query.dto';

@Controller('transfer-requests')
export class TransferRequestController {
  constructor(
    private readonly transferRequestService: TransferRequestService,
  ) {}

  @Get('received')
  @UseGuards(JwtAuthGuard)
  async findReceived(
    @CurrentUser() user: { userId: string },
    @Query() query: FindTransferRequestsQueryDto,
  ) {
    return this.transferRequestService.findReceivedRequests(
      user.userId,
      query.status,
    );
  }

  @Get('sent')
  @UseGuards(JwtAuthGuard)
  async findSent(
    @CurrentUser() user: { userId: string },
    @Query() query: FindTransferRequestsQueryDto,
  ) {
    return this.transferRequestService.findSentRequests(
      user.userId,
      query.status,
    );
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async accept(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transferRequestService.acceptTransferRequest(user.userId, id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  async reject(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transferRequestService.rejectTransferRequest(user.userId, id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transferRequestService.cancelTransferRequest(user.userId, id);
  }
}
