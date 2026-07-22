-- =============================================================================
-- GRANTS: espelha o padrão já usado em produção (perfis/permissoes_perfil):
-- grant amplo de tabela para anon/authenticated/service_role, com RLS como
-- camada real de controle de acesso. Sem o GRANT, PostgREST retorna 403
-- mesmo que a RLS permitisse a operação.
-- =============================================================================

grant usage on schema public to authenticated, anon, service_role;

grant select, insert, update, delete on
  perfis,
  permissoes_perfil,
  doadores,
  campanhas,
  lancamentos_doacao_item,
  transacoes,
  precos_referencia,
  voluntarios,
  documentos,
  configuracoes_sistema
to anon, authenticated, service_role;

grant select, insert, update, delete on import_lotes, import_erros to service_role;

grant select on vw_campanhas_resumo to anon, authenticated, service_role;
