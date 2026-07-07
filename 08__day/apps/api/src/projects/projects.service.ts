import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
  ) {}

  async create(ownerId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projects.create({ ownerId, ...dto });
    return this.projects.save(project);
  }

  async listForOwner(ownerId: string): Promise<Project[]> {
    return this.projects.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  async findOneOwned(ownerId: string, id: string): Promise<Project> {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) throw new NotFoundException('project not found');
    if (project.ownerId !== ownerId) throw new ForbiddenException('not your project');
    return project;
  }

  async update(ownerId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOneOwned(ownerId, id);
    Object.assign(project, dto);
    return this.projects.save(project);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const project = await this.findOneOwned(ownerId, id);
    await this.projects.remove(project);
  }
}
