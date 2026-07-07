import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkWalletDto } from './dto/link-wallet.dto';
import { WalletsService } from './wallets.service';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.walletsService.list(userId);
  }

  @Post()
  link(@CurrentUser('id') userId: string, @Body() dto: LinkWalletDto) {
    return this.walletsService.link(userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') walletId: string) {
    return this.walletsService.remove(userId, walletId);
  }
}
