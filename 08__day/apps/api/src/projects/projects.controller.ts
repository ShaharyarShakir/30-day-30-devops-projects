import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@CurrentUser('id') ownerId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(ownerId, dto);
  }

  @Get()
  list(@CurrentUser('id') ownerId: string) {
    return this.projectsService.listForOwner(ownerId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') ownerId: string, @Param('id') id: string) {
    return this.projectsService.findOneOwned(ownerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(ownerId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') ownerId: string, @Param('id') id: string) {
    return this.projectsService.remove(ownerId, id);
  }
}
