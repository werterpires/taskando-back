import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationsMemberDto } from './create-organizations-member.dto';

export class UpdateOrganizationsMemberDto extends PartialType(CreateOrganizationsMemberDto) {}
