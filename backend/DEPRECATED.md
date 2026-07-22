# Descontinuado

Este backend Express + `data.json` foi **aposentado**. O sistema agora fala
diretamente com o Supabase (Postgres + Auth + Storage) — ver `DEV.md` na raiz
do repositório.

`data.json` e `uploads/` são mantidos aqui apenas como **fonte de dados** para
o script único de migração histórica em `scripts/migrate-data-json-to-supabase.ts`.
Depois que a migração for aplicada em produção e validada, esta pasta pode ser
removida do repositório.

Não rode mais `node backend/index.js` — nenhuma página do frontend depende
dele.
