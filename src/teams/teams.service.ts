import { Injectable } from '@nestjs/common'
import { TeamsHelper } from './teams.helper'

@Injectable()
export class TeamsService {
  constructor(private readonly teamsHelper: TeamsHelper) {}
}
