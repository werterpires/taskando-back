export enum userRoleEnum {
  WATCHER = 'watcher',
  REVIEWER = 'reviewer',
  EXECUTOR = 'executor',
  EDITOR = 'editor',
  CONTRIBUTOR = 'contributor',
  LEADER = 'leader',
  OWNER = 'owner'
}

export const userRoles: userRole[] = [
  {
    name: userRoleEnum.CONTRIBUTOR,
    description: 'Não pode nada'
  },
  {
    name: userRoleEnum.WATCHER,
    description: 'Pode ver'
  },
  {
    name: userRoleEnum.EXECUTOR,
    description: 'Pode ver e interagir'
  },
  {
    name: userRoleEnum.REVIEWER,
    description: 'Pode ver, interagir e aprovar'
  },
  {
    name: userRoleEnum.EDITOR,
    description: 'Pode ver, interagir, aprovar e adicionar filhos'
  },
  {
    name: userRoleEnum.LEADER,
    description:
      'Pode Ver, interagir, aprovar, adicionar filos e adicionar membros.'
  },
  {
    name: userRoleEnum.OWNER,
    description:
      'Pode Ver, interagir, aprovar, adicionar filos, adicionar membros, editar e deletar.'
  }
]

export interface userRole {
  name: userRoleEnum
  description: string
}
