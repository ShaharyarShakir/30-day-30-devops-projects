import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class WalletLoginDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['evm', 'solana'])
  chainFamily: 'evm' | 'solana';
}
