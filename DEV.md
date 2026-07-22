# Desenvolvimento local

Este projeto roda **100% contra Supabase** (Postgres + Auth + Storage). Não existe
mais um backend Express separado — em desenvolvimento local, o Supabase CLI sobe
uma cópia completa do stack (Postgres, Auth, Storage, Studio) via Docker,
aplicando as mesmas migrations versionadas que vão para produção.

## Pré-requisitos

- [Docker Desktop](https://docs.docker.com/desktop) instalado e rodando
- Node.js 20+
- `pnpm` (`npm install -g pnpm`)
- Supabase CLI (não precisa instalar globalmente — use `npx supabase`)

## Subindo o ambiente local

```powershell
# 1. Sobe Postgres + Auth + Storage + Studio em containers Docker
npx supabase start

# 2. Aplica todas as migrations (supabase/migrations/) + dados de teste (supabase/seed.sql)
npx supabase db reset
```

O comando `supabase start` imprime as credenciais locais no final (API_URL,
ANON_KEY, SERVICE_ROLE_KEY, STUDIO_URL). Esses valores são fixos/determinísticos
para o projeto local (não regeneram a cada `supabase start`), então normalmente
você só precisa copiar uma vez para o `.env.local`.

Studio (interface visual do Postgres local) fica em `http://127.0.0.1:54323`.

## Frontend

```powershell
cd frontend/ong-system
cp .env.example .env.local   # ajuste para as credenciais LOCAIS impressas por `supabase start`
pnpm install
pnpm dev
```

Abre em `http://localhost:5173`.

### Usuários de teste (senha para todos: `senha123`)

| Email | Cargo |
|---|---|
| admin@ong.org | admin_master |
| financeiro@ong.org | financeiro |
| visualizador@ong.org | visualizador |

## Estrutura de migrations

```
supabase/
├── migrations/
│   ├── ..._base_schema_reconstruida.sql       # perfis/permissoes_perfil/RPCs de equipe (reconstrução do schema já existente em produção)
│   ├── ..._campanhas_financeiro.sql            # doadores, campanhas, lançamentos, transações, view de resumo
│   ├── ..._precos_voluntarios_documentos_config.sql
│   └── ..._grants_authenticated_role.sql       # GRANTs explícitos (Supabase recente não expõe tabelas novas por padrão)
└── seed.sql                                     # dados fake de desenvolvimento (nunca dados reais)
```

**IMPORTANTE sobre a primeira migration**: ela foi escrita reconstruindo o
schema de auth/RBAC (`perfis`, `permissoes_perfil`, RPCs `listar_membros_equipe`
etc.) a partir da leitura do código do frontend, porque no momento em que foi
escrita não havia acesso via MCP ao projeto Supabase real da ONG. **Antes de
aplicar em produção pela primeira vez**, rode:

```powershell
npx supabase link --project-ref <ref-do-projeto-acaoentreamigos>
npx supabase db pull
```

e compare o schema puxado com `..._base_schema_reconstruida.sql` — se já existir
em produção, não reaplique essa migration (ou ajuste-a para bater exatamente).
As migrations seguintes (campanhas/financeiro/preços/voluntários/documentos/
configurações/grants) são 100% novas e podem ser aplicadas normalmente.

## Aplicando migrations em produção

**Nunca** aplique migrations em produção sem confirmar o `project-ref` correto.
O projeto da ONG é `kicposaltebnfatqhitv` (região Ohio, us-east-2) — **não** é o
projeto "Procedi-tech" (outro projeto Supabase não relacionado).

```powershell
npx supabase link --project-ref kicposaltebnfatqhitv
npx supabase db push
```

## Scripts de migração/importação de dados

Ver `scripts/README.md` para o script que migra `backend/data.json` (sistema
legado) e o script de importação do banco de doações histórico.

## Testando o fluxo completo

1. Login com `admin@ong.org` / `senha123`
2. Criar uma campanha em **Campanhas**
3. Abrir a campanha e lançar um item recebido + uma transação financeira vinculada
4. Conferir que o saldo da campanha atualiza
5. Gerar os PDFs (itens faltantes / resumo da campanha)
6. Conferir **Financeiro** (KPIs de mês vs. total), **Voluntários**, **Preços de
   Referência**, **Equipe** e **Configurações**
