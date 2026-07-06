import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContractDto {
  @MinLength(1)
  name: string;

  @IsIn(['evm', 'solana'])
  chainFamily: 'evm' | 'solana';

  // 'solidity' | 'rust' -- kept as a free string so we're not blocked from
  // adding e.g. 'vyper' later without a migration.
  @IsString()
  language: string;

  @IsString()
  sourcePath: string;

  @IsOptional()
  @IsString()
  compilerVersion?: string;
}
