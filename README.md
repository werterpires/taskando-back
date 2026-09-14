# Taskando API

API NestJS do Taskando, portada da exportação `Taskando-completo` para PostgreSQL. O domínio mantém os contratos HTTP existentes, hierarquia livre, papéis por item, aprovações, dependências DAG, recorrência, fila cíclica, templates, notificações, lixeira e MCP.

## Estrutura Nest

O código de entrada está organizado por módulos de negócio em `src/modules`: cada módulo possui `*.module.ts`, `*.controller.ts` e `*.service.ts`. Os controllers cuidam somente do transporte HTTP; os services são a porta de entrada do domínio; `src/db` concentra persistência, autorização e regras compartilhadas. `src/app/api` é um conjunto interno de handlers portados da origem, isolado atrás dos services para que possa ser substituído progressivamente sem alterar as URLs públicas.

Os módulos principais são `tasks`, `projects`, `organizations`, `structure`, `planning`, `recurrence`, `lists`, `notifications` e `system`. `src/modules/core` fornece autenticação e o contexto transacional compartilhado.

## Ambiente local

Requisitos: Node.js 22.13 ou superior, npm e Docker com Compose.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Antes de executar `db:seed`, defina no `.env` uma `TASKANDO_SEED_PASSWORD` de pelo menos oito caracteres. Nome e e-mail iniciais podem ser alterados por `TASKANDO_SEED_NAME` e `TASKANDO_SEED_EMAIL`; os padrões são `Administrador` e `admin@taskando.local`. A seed é idempotente e não redefine a senha de uma credencial já existente.

Em produção, configure `SSL_CA_PATH` com a CA do PostgreSQL. Para provedores que exigem mTLS, configure também `SSL_CERT_PATH` e `SSL_KEY_PATH` com o certificado e a chave privada do cliente; os dois devem ser fornecidos juntos. O backend, as migrations, a seed e o importador usarão esses arquivos com validação do certificado do servidor. Deixe as três variáveis vazias ou ausentes no ambiente local para conectar sem SSL.

O frontend encaminha `/api` para esta API, que escuta em `127.0.0.1:3000`. Não há cadastro público: o usuário inicial vem da seed e qualquer usuário autenticado pode criar outra conta, informando a senha inicial. Cada usuário pode trocar a própria senha na tela de configurações. As senhas são armazenadas como hashes `scrypt` com salt individual. As variáveis OAuth do Google são opcionais e ficam reservadas para a retomada futura desse provedor.

## Cache de leituras

O backend mantém um cache privado, em memória por processo, para `GET /api/tasks`, `/api/priority-matrix`, `/api/context`, `/api/task-containers/:parentType/:parentId` e `/api/work-progress/:parentType/:parentId`. A chave inclui o usuário autenticado e a URL com parâmetros de consulta normalizados. Os padrões são `TASKANDO_CACHE_ENABLED=true`, `TASKANDO_CACHE_TTL_SECONDS=600` e `TASKANDO_CACHE_MAX_ENTRIES=128` (LRU). Defina `TASKANDO_CACHE_ENABLED=false` para desligá-lo.

O cabeçalho `X-Taskando-Cache` indica `MISS`, `HIT` ou `BYPASS`; `Cache-Control: no-store` continua impedindo cache no cliente. Respostas diferentes de HTTP 200 não são armazenadas. Mutações HTTP ou MCP bem-sucedidas que afetam tarefas, hierarquia, permissões ou progresso invalidam as entradas; operações de leitura e alterações sem efeito nessas projeções não invalidam. A invalidação é por processo e, portanto, instâncias diferentes não compartilham entradas nem sinais de invalidação. Para observar dados imediatamente após mutações feitas fora desta API ou em outra instância, desabilite o cache ou use uma camada de invalidação compartilhada.

## Migração dos dados do Sites/D1

O pacote recebido inclui schema e migrations, mas não inclui os dados vivos. Exporte o D1 com Wrangler (arquivo SQL) ou forneça um banco SQLite e execute, depois das migrations PostgreSQL:

```bash
npm run db:import -- /caminho/para/taskando-d1.sql
```

O importador preserva IDs, executa tudo em uma transação, converte inteiros SQLite em booleanos PostgreSQL e ignora dados já existentes. Para conceder acesso inicial a um usuário importado sem credencial, configure o e-mail dele em `TASKANDO_SEED_EMAIL` e execute a seed uma vez.

## Verificação

```bash
npm run build
npm test
```

As migrations são versionadas em `drizzle/`. Não há sincronização automática de schema em produção.
