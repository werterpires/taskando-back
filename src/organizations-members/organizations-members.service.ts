import { Injectable } from '@nestjs/common';
import { CreateOrganizationsMemberDto } from './dto/create-organizations-member.dto';
import { UpdateOrganizationsMemberDto } from './dto/update-organizations-member.dto';

@Injectable()
export class OrganizationsMembersService {
  create(createOrganizationsMemberDto: CreateOrganizationsMemberDto) {
    return 'This action adds a new organizationsMember';
  }

  findAll() {
    return `This action returns all organizationsMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} organizationsMember`;
  }

  update(id: number, updateOrganizationsMemberDto: UpdateOrganizationsMemberDto) {
    return `This action updates a #${id} organizationsMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} organizationsMember`;
  }
}
