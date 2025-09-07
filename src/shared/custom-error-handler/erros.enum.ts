export enum CustomErrors {
  UNAUTHORIZED_EXCEPTION = '#Email e/ou senha não encontrado(s) ou não se correspondem',
  INACTIVE_USER = '#Usuário inativado pelo administrador do sistema.',
  USER_NOT_FOUND_BY_INVITATION_CODE = '#Código de convite não encontrado.',
  INVITE_CODE_EXPIRED = '#Convite expirado.',
  TERMS_NOT_SIGNED = '#Todos os termos de uso devem ser aceitos.',
  INSUFFICIENT_PERMISSIONS = '#Apenas owners ou leaders da organização podem criar convites',
  ORGANIZATION_NOT_FOUND = '#Organização não encontrada',
  USER_NOT_OWNER_OR_LEADER = '#Usuário não possui permissão para esta operação na organização'
}
