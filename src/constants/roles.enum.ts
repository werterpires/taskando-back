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
    name: userRoleEnum.WATCHER,
    description: 'Pode ver a coisa e seus filhos.'
  },
  {
    name: userRoleEnum.REVIEWER,
    description:
      'Pode ver a coisa e seus filhos, aprovar ou desaprovar a coisa.'
  },
  {
    name: userRoleEnum.EXECUTOR,
    description:
      'Pode ver a coisa e seus filhos, editar os filhos, criar e deletar filhos.'
  },
  {
    name: userRoleEnum.EDITOR,
    description:
      'Pode ver a coisa e seus filhos, editar a coisa e editar os filhos.'
  },
  {
    name: userRoleEnum.CONTRIBUTOR,
    description:
      'Pode ver a coisa e seus filhos, criar filhos, mas não deletar.'
  },
  {
    name: userRoleEnum.LEADER,
    description:
      'Pode ver a coisa e seus filhos, aprovar ou desaprovar, editar, adicionar ou remover membros, criar e deletar filhos.'
  },
  {
    name: userRoleEnum.OWNER,
    description: 'Pode fazer tudo, incluindo transferir a propriedade da coisa.'
  }
]

export interface userRole {
  name: userRoleEnum
  description: string
}
