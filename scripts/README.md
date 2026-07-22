# Scripts de migração e importação de dados

Ambos os scripts usam a `service_role` key do Supabase (nunca a anon key) e por
isso rodam via Node, fora do frontend. Configure `.env` na raiz do repositório
a partir de `.env.example` antes de usar.

## `migrate-data-json-to-supabase.ts`

Migra o sistema legado (`backend/data.json`, Express+JSON) para o Postgres novo.

```powershell
cd scripts
npm install
npm run migrate-legacy -- --target=local --dry-run   # 1. sempre rode dry-run primeiro
npm run migrate-legacy -- --target=local              # 2. valida contra o Supabase local
# 3. revise os relatórios em scripts/reports/ com o time antes de ir para produção
npm run migrate-legacy -- --target=production --confirmo-producao
```

Nunca corrige dados financeiros suspeitos automaticamente (ex: transação
"Entrada" com valor negativo no texto original) — essas linhas ficam de fora e
são listadas em `reports/migration-report-transacoes-suspeitas.csv` para
decisão manual.

## `import-doacoes.ts`

Importa um arquivo externo de doações históricas (ex: banco do Rodrigo) via CSV.

```powershell
cp import-mapping.example.json import-mapping.json
# edite import-mapping.json com os nomes de coluna do arquivo real

npm run import-doacoes -- --file=./caminho/doacoes.csv --dry-run
npm run import-doacoes -- --file=./caminho/doacoes.csv --target=local
```

- Campanhas são casadas por nome (normalizado, sem acento). Quando não há
  correspondência, a linha fica registrada em
  `reports/import-report-campanhas-nao-mapeadas.csv` — nada é adivinhado ou
  criado automaticamente.
- Aceita valores em `150.00`, `150,00` ou `1.500,00`, e datas em `YYYY-MM-DD`
  ou `DD/MM/YYYY`.
- Doadores são casados por nome (case-insensitive) e criados automaticamente
  quando não existem, com `origem = 'import_rodrigo'`.
