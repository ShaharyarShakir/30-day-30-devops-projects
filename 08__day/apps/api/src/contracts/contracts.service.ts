import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(
    ownerId: string,
    projectId: string,
    dto: CreateContractDto,
  ): Promise<Contract> {
    // Throws NotFound/Forbidden if the project doesn't exist or isn't theirs.
    await this.projectsService.findOneOwned(ownerId, projectId);

    const contract = this.contracts.create({ projectId, ...dto });
    return this.contracts.save(contract);
  }

  async listForProject(ownerId: string, projectId: string): Promise<Contract[]> {
    await this.projectsService.findOneOwned(ownerId, projectId);
    return this.contracts.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async findOneOwned(ownerId: string, contractId: string): Promise<Contract> {
    const contract = await this.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('contract not found');
    // Validates the parent project belongs to this user.
    await this.projectsService.findOneOwned(ownerId, contract.projectId);
    return contract;
  }
}
