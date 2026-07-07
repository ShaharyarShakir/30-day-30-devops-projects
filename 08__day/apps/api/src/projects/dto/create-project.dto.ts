import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateProjectDto {
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;
}
