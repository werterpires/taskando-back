# Migração Taskando — Angular, NestJS e PostgreSQL

Autorizada nesta sessão: executar aqui. Fonte: `Taskando-completo/taskando-export`.
A nova implementação ocupa `taskando-back` e `taskandoFront`. O conteúdo anterior foi removido por instrução explícita do usuário; os repositórios Git foram mantidos.

A entrada da API foi reorganizada em módulos Nest convencionais (`module`, `controller`, `service`) por domínio. Os handlers portados ficaram isolados como camada interna temporária, atrás desses services, para permitir uma substituição incremental sem quebrar os contratos HTTP.

## Objetivo e arquitetura

Recriar a experiência do Taskando em Angular standalone, servida por API NestJS com autenticação Google OpenID Connect e PostgreSQL. Preservar os contratos HTTP e regras existentes, portando o domínio TypeScript e Drizzle para PostgreSQL. Os handlers de domínio tornam-se operações chamadas por controllers NestJS; nenhuma dependência de React, Next, Workers ou Sites na aplicação nova.

Projetos npm independentes: `taskandoFront` (Angular), `taskando-back` (NestJS). Migração SQL versionada, sem synchronize. Sessões opacas armazenadas no PostgreSQL; cookies HttpOnly, SameSite, verificação de origem para escrita, OAuth com state, nonce e PKCE. Google sub é a identidade estável; vinculação de usuários importados exige email verificado.

## Etapas e aceitação

1. Inventariar origem e decisões: rotas/tabelas em `taskando-back/dev/tmp/inventario-origem.json`.
2. Portar schema, consultas e operações para PostgreSQL, incluindo transações e bloqueios para invariantes concorrentes. Cobrir rollback, permissões, dependências, recorrência e templates em testes.
3. Montar API NestJS, sessões Google e controllers de todos os contratos exportados. Autenticação inválida não chega ao domínio; erros não expõem SQL ou segredos.
4. Recriar interface Angular: navegação/contextos, tarefas/detalhes, lista/Kanban/calendário/quadrante, estrutura, projetos/frentes/produtos/processos/fases, dependências, listas pessoais, templates, cíclicas, séries, lembretes, notificações, papéis, transferências, lixeira, configurações e MCP.
5. Entregar migração de dados a partir de SQLite/D1 exportado, com validação e operação atômica; preservar IDs e relacionamentos. Nenhuma leitura ou alteração do banco remoto.
6. Verificar builds, testes de domínio/API e interface; documentar instalação e evidências.

## Decisões herdadas

`docs/fase-22-decisoes-de-produto.md` da origem prevalece sobre perguntas ainda abertas da esquematização: aprovação configurável e desligada por padrão; conclusão dos filhos respeita aprovação; Owner obrigatório apto a aprovar; Data sem aprovação; Evento libera ao terminar; cancelamentos exigem confirmação; prazo da subtarefa não ultrapassa o da mãe; Produto tem características chave/valor; recorrência usa janela de 12 meses. Não introduzir estimativa de tempo nem Gantt.

## Limites externos

A exportação não contém dados vivos D1 nem credenciais. Entregar código e ferramentas de migração não significa ter transferido esses dados. Login Google real exige CLIENT_ID, CLIENT_SECRET e redirect URI configurados no projeto Google do usuário. Nenhuma publicação ou alteração de infraestrutura faz parte da execução local.

## Referências técnicas

- https://angular.dev/reference/versions
- https://docs.nestjs.com/migration-guide
- https://orm.drizzle.team/docs/get-started-postgresql
- https://orm.drizzle.team/docs/transactions
- https://developers.google.com/identity/openid-connect/openid-connect

## Resultado da execução

Migração implementada em `taskando-back` e `taskandoFront`, com remoção integral do código anterior conforme autorizado. O backend contém o schema PostgreSQL versionado, API NestJS, login Google OIDC, sessões persistidas e importador transacional para exports D1 em SQL ou bancos SQLite. O frontend Angular cobre os fluxos e visões inventariados na exportação de origem.

Verificações concluídas em 9 de setembro de 2026:

- build Angular de produção;
- build TypeScript do NestJS;
- testes das regras de hierarquia, liberação, recorrência e fila cíclica;
- aplicação da migration em PostgreSQL 17;
- importação de fixture D1 SQL com usuário, espaço e tarefas mãe/filha;
- confirmação de IDs, relacionamento e conversão de booleanos no PostgreSQL;
- execução da API e respostas HTTP 200 em `/api/health` e 401 sem sessão em `/api/auth/me`;
- `git diff --check` nos dois repositórios.

Refatoração estrutural adicional concluída após revisão: os 71 controllers de domínio foram distribuídos em nove módulos Nest (`tasks`, `projects`, `organizations`, `structure`, `planning`, `recurrence`, `lists`, `notifications` e `system`), cada um com controller, service e module próprios. O `AppModule` agora compõe esses módulos e um `CoreModule` global; a inicialização registrou 130 rotas Nest. A camada `src/app/api` permanece apenas como implementação interna portável dos handlers de origem, sem exposição direta no módulo principal.

A exportação fornecida não inclui o banco D1 vivo nem credenciais Google. A transferência dos dados reais usa `npm run db:import` quando o arquivo exportado estiver disponível; o login real usa as credenciais descritas em `.env.example`.
