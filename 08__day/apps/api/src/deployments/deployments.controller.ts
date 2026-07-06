import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { DeploymentsService } from './deployments.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('deploy')
  create(@CurrentUser('id') ownerId: string, @Body() dto: CreateDeploymentDto) {
    return this.deploymentsService.create(ownerId, dto);
  }

  @Get('deployments')
  list(@CurrentUser('id') ownerId: string) {
    return this.deploymentsService.list(ownerId);
  }

  @Get('deployments/:id')
  findOne(@CurrentUser('id') ownerId: string, @Param('id') id: string) {
    return this.deploymentsService.findOneOwned(ownerId, id);
  }

  @Get('contracts/:contractId/deployments')
  history(
    @CurrentUser('id') ownerId: string,
    @Param('contractId') contractId: string,
  ) {
    return this.deploymentsService.historyForContract(ownerId, contractId);
  }
}
