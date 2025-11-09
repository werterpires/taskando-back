export enum userRoleEnum {
  WATCHER = 'A',
  REVIEWER = 'AB',
  EXECUTOR = 'ABC',
  EDITOR = 'ABCD',
  CONTRIBUTOR = 'ABCE',
  LEADER = 'ABCDEF',
  OWNER = 'ABCDEFG'
}

export const powers = {
  view: 'A',
  seeChildren: 'B',
  interact: 'C',
  approve: 'D',
  addChildren: 'E',
  addMembers: 'F',
  editAndDelete: 'G'
}

export const userRoles: userRole[] = [
  {
    name: userRoleEnum.WATCHER,
    description: 'Pode ver'
  },
  {
    name: userRoleEnum.CONTRIBUTOR,
    description: 'Pode ver e ver filhos'
  },
  {
    name: userRoleEnum.EXECUTOR,
    description: 'Pode ver e interagir, ver filhos'
  },
  {
    name: userRoleEnum.REVIEWER,
    description: 'Pode ver, interagir e aprovar, ver filhos'
  },
  {
    name: userRoleEnum.EDITOR,
    description: 'Pode ver, interagir e adicionar filhos, ver filhos'
  },
  {
    name: userRoleEnum.LEADER,
    description:
      'Pode Ver, interagir, aprovar, adicionar filhos, ver filhos e adicionar membros.'
  },
  {
    name: userRoleEnum.OWNER,
    description:
      'Pode Ver, interagir, aprovar, adicionar filhos, adicionar membros, editar e deletar.'
  }
]

export interface userRole {
  name: userRoleEnum
  description: string
}
