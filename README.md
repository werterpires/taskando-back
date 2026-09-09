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
npm run dev
```

Configure no `.env` um cliente OAuth Web do Google. O redirect URI local deve ser exatamente `http://localhost:4200/api/auth/google/callback`. O frontend encaminha `/api` para esta API, que escuta em `127.0.0.1:3000`.

## Migração dos dados do Sites/D1

O pacote recebido inclui schema e migrations, mas não inclui os dados vivos. Exporte o D1 com Wrangler (arquivo SQL) ou forneça um banco SQLite e execute, depois das migrations PostgreSQL:

```bash
npm run db:import -- /caminho/para/taskando-d1.sql
```

O importador preserva IDs, executa tudo em uma transação, converte inteiros SQLite em booleanos PostgreSQL e ignora dados já existentes. Sessões e identidades Google são criadas no primeiro login; um usuário importado é vinculado somente quando o Google fornece o mesmo e-mail verificado.

## Verificação

```bash
npm run build
npm test
```

As migrations são versionadas em `drizzle/`. Não há sincronização automática de schema em produção.
