import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrganizationsMembersService } from './organizations-members.service';
import { CreateOrganizationsMemberDto } from './dto/create-organizations-member.dto';
import { UpdateOrganizationsMemberDto } from './dto/update-organizations-member.dto';

@Controller('organizations-members')
export class OrganizationsMembersController {
  constructor(private readonly organizationsMembersService: OrganizationsMembersService) {}

  @Post()
  create(@Body() createOrganizationsMemberDto: CreateOrganizationsMemberDto) {
    return this.organizationsMembersService.create(createOrganizationsMemberDto);
  }

  @Get()
  findAll() {
    return this.organizationsMembersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsMembersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrganizationsMemberDto: UpdateOrganizationsMemberDto) {
    return this.organizationsMembersService.update(+id, updateOrganizationsMemberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsMembersService.remove(+id);
  }
}
