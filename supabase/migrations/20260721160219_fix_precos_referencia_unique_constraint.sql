-- O índice único original era sobre lower(item_nome) (expressão), que o
-- PostgREST/Supabase JS não consegue usar como alvo de ON CONFLICT em upsert
-- (`.upsert(x, { onConflict: 'item_nome' })` falhava com "there is no unique
-- or exclusion constraint matching the ON CONFLICT specification") — afetava
-- tanto a tela de Preços de Referência quanto o script de import.
drop index if exists precos_referencia_item_uniq;
alter table precos_referencia add constraint precos_referencia_item_nome_key unique (item_nome);
