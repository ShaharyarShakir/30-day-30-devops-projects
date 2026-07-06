import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDeploymentDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  network: string;

  @IsUUID()
  @IsOptional()
  walletId?: string;
}
