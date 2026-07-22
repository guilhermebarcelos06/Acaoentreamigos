# Resumo das Implementações

> Este arquivo documentava a versão antiga do sistema (backend Express +
> `data.json`). Essa arquitetura foi **substituída** por Supabase (Postgres +
> Auth + Storage) — ver `DEV.md` para o guia atual de desenvolvimento local e
> `scripts/README.md` para os scripts de migração/importação de dados.
>
> O conteúdo abaixo é histórico e está desatualizado.

## Backend (descontinuado, ver `backend/DEPRECATED.md`)
- Servidor Express em `backend/index.js` rodando na porta 3001.
- Endpoints para Campanhas, Transações, Voluntários, Usuários.
- Persistência de dados em arquivo JSON (`data.json`).

## Frontend (reescrito para falar direto com Supabase)
- Todas as páginas passaram a usar `src/lib/services/*.ts` (Supabase) em vez
  de `fetch` para o backend Express.
- Nova entidade **Campanha** unificando metas de itens e financeiro vinculado
  (`Campaigns.tsx` + `CampaignDetail.tsx`, antes `Donations.tsx`).
- Nova tela de **Preços de Referência** para estimar valor de doações em espécie.
- PDFs de itens faltantes e resumo por campanha (`src/lib/pdf/`).

## Como Executar

Ver `DEV.md` na raiz do repositório.
