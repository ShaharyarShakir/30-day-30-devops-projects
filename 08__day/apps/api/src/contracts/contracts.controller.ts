import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateContractDto } from './dto/create-contract.dto';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('projects/:projectId/contracts')
  create(
    @CurrentUser('id') ownerId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(ownerId, projectId, dto);
  }

  @Get('projects/:projectId/contracts')
  listForProject(
    @CurrentUser('id') ownerId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.contractsService.listForProject(ownerId, projectId);
  }

  @Get('contracts/:id')
  findOne(@CurrentUser('id') ownerId: string, @Param('id') id: string) {
    return this.contractsService.findOneOwned(ownerId, id);
  }
}
