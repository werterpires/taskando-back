import { Injectable, BadRequestException } from '@nestjs/common'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { CreateTeamData } from './types'
import { ValidateUser } from '../shared/auth/types'

@Injectable()
export class TeamsHelper {
  makeCreateTeamDataFromDto(
    createTeamDto: CreateTeamDto,
    currentUser: ValidateUser
  ): CreateTeamData {
    // Validar que apenas um pai pode ser informado
    if (createTeamDto.orgId && createTeamDto.deptId) {
      throw new BadRequestException(
        'A team can have only one parent: either orgId or deptId, not both'
      )
    }

    return {
      name: createTeamDto.name,
      ownerId: currentUser.userId,
      deptId: createTeamDto.deptId,
      orgId: createTeamDto.orgId
    }
  }

  makeUpdateTeamDataFromDto(
    updateTeamDto: UpdateTeamDto
  ): Partial<CreateTeamData> {
    const updateData: Partial<CreateTeamData> = {}

    if (updateTeamDto.name !== undefined) {
      updateData.name = updateTeamDto.name
    }
    return updateData
  }
}
