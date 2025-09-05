import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsMembersService } from './organizations-members.service';

describe('OrganizationsMembersService', () => {
  let service: OrganizationsMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsMembersService],
    }).compile();

    service = module.get<OrganizationsMembersService>(OrganizationsMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
