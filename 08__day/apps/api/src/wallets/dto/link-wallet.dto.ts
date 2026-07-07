import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class LinkWalletDto {
  @IsIn(['evm', 'solana'])
  chainFamily: 'evm' | 'solana';

  @IsString()
  address: string;

  // Where the actual signing key lives in Vault (e.g. "secret/wallets/<uuid>").
  // The blockchain-service (Sprint 4) is what actually writes/reads the key
  // material; the API only ever stores this pointer.
  @IsString()
  vaultKeyPath: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
