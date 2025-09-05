import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsMembersController } from './organizations-members.controller';
import { OrganizationsMembersService } from './organizations-members.service';

describe('OrganizationsMembersController', () => {
  let controller: OrganizationsMembersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsMembersController],
      providers: [OrganizationsMembersService],
    }).compile();

    controller = module.get<OrganizationsMembersController>(OrganizationsMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
