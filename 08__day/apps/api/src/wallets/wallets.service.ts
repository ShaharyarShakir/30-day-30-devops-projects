import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { LinkWalletDto } from './dto/link-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(@InjectRepository(Wallet) private readonly wallets: Repository<Wallet>) {}

  async list(userId: string): Promise<Wallet[]> {
    return this.wallets.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async link(userId: string, dto: LinkWalletDto): Promise<Wallet> {
    if (dto.isDefault) {
      // Only one default wallet per chain family per user.
      await this.wallets.update(
        { userId, chainFamily: dto.chainFamily },
        { isDefault: false },
      );
    }

    const wallet = this.wallets.create({
      userId,
      chainFamily: dto.chainFamily,
      address: dto.address,
      vaultKeyPath: dto.vaultKeyPath,
      isDefault: dto.isDefault ?? false,
    });

    return this.wallets.save(wallet);
  }

  async remove(userId: string, walletId: string): Promise<void> {
    const wallet = await this.wallets.findOne({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('wallet not found');
    if (wallet.userId !== userId) throw new ForbiddenException('not your wallet');
    await this.wallets.remove(wallet);
  }
}
