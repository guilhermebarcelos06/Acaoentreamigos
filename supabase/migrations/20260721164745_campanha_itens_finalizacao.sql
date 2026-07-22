-- =============================================================================
-- CAMPANHA COM MÚLTIPLOS ITENS, DURAÇÃO, DOCUMENTOS VINCULADOS,
-- FINALIZAÇÃO (bloqueio total) E REABERTURA (senha + admin)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Remove a view antiga (referencia colunas que serão removidas/renomeadas)
-- ---------------------------------------------------------------------------
drop view if exists vw_campanhas_resumo;

-- ---------------------------------------------------------------------------
-- 1. campanhas: duração explícita (data_fim), auditoria de finalização.
--    categoria/unidade/meta_quantidade saem daqui — agora vivem por item.
-- ---------------------------------------------------------------------------
alter table campanhas rename column prazo_limite to data_fim;
alter table campanhas drop column categoria;
alter table campanhas drop column unidade;
alter table campanhas drop column meta_quantidade;
alter table campanhas add column finalizada_em timestamptz;
alter table campanhas add column finalizada_por uuid references perfis(id);
alter table campanhas add constraint campanhas_data_fim_check
  check (data_fim is null or data_fim >= data_inicio);

-- ---------------------------------------------------------------------------
-- 2. campanha_itens: os itens de doação dentro de uma campanha
--    (ex: óleo, cesta básica, itens de higiene), cada um com sua meta.
-- ---------------------------------------------------------------------------
create table campanha_itens (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  nome text not null,
  categoria text not null,
  unidade text not null,
  meta_quantidade numeric(12,2) not null default 0 check (meta_quantidade >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index campanha_itens_campanha_idx on campanha_itens (campanha_id);

alter table campanha_itens enable row level security;

create trigger set_campanha_itens_updated_at before update on campanha_itens
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3. lancamentos_doacao_item passa a apontar pro item específico.
--    campanha_id é preenchido automaticamente por trigger — nunca confiar no
--    cliente pra esse valor, e mantém os índices/policies por campanha_id.
-- ---------------------------------------------------------------------------
alter table lancamentos_doacao_item add column campanha_item_id uuid references campanha_itens(id) on delete cascade;

create or replace function set_lancamento_campanha_id()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog' as $$
begin
  select campanha_id into new.campanha_id from campanha_itens where id = new.campanha_item_id;
  if new.campanha_id is null then
    raise exception 'campanha_item_id inválido.';
  end if;
  return new;
end;
$$;

create trigger set_lancamento_campanha_id_trigger
before insert or update of campanha_item_id on lancamentos_doacao_item
for each row execute function set_lancamento_campanha_id();

create index lancamentos_doacao_item_item_idx on lancamentos_doacao_item (campanha_item_id);

-- ---------------------------------------------------------------------------
-- 4. documentos ganha vínculo opcional com campanha (documentos globais
--    continuam existindo com campanha_id = null).
-- ---------------------------------------------------------------------------
alter table documentos add column campanha_id uuid references campanhas(id) on delete set null;
create index documentos_campanha_idx on documentos (campanha_id);

-- ---------------------------------------------------------------------------
-- 5. Auditoria de reabertura — só a RPC (security definer) grava aqui.
-- ---------------------------------------------------------------------------
create table campanha_reaberturas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  reaberta_por uuid references perfis(id),
  motivo text,
  reaberta_em timestamptz not null default now()
);

create index campanha_reaberturas_campanha_idx on campanha_reaberturas (campanha_id);

alter table campanha_reaberturas enable row level security;

create policy "campanha_reaberturas_select" on campanha_reaberturas for select
  using (get_minha_permissao('doacoes', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

-- ---------------------------------------------------------------------------
-- 6. Trigger de auditoria de finalização (nunca confiar em finalizada_em/por
--    vindos do cliente).
-- ---------------------------------------------------------------------------
create or replace function set_campanha_finalizacao()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog' as $$
begin
  if new.status = 'finalizada' and old.status is distinct from 'finalizada' then
    new.finalizada_em := now();
    new.finalizada_por := auth.uid();
  elsif new.status <> 'finalizada' and old.status = 'finalizada' then
    new.finalizada_em := null;
    new.finalizada_por := null;
  end if;
  return new;
end;
$$;

create trigger set_campanha_finalizacao_trigger
before update on campanhas
for each row execute function set_campanha_finalizacao();

-- ---------------------------------------------------------------------------
-- 7. RLS: bloqueio total (insert/update/delete) quando a campanha está
--    finalizada. Como múltiplas policies permissivas se combinam com OR, o
--    bloqueio precisa estar embutido na MESMA condição da policy existente
--    (drop + recreate), nunca numa policy nova separada.
-- ---------------------------------------------------------------------------

-- campanhas: permite a transição ativa->finalizada (checa o status ATUAL da
-- linha), mas bloqueia qualquer novo update numa linha já finalizada —
-- forçando o caminho da RPC reabrir_campanha (security definer, ignora RLS).
drop policy "campanhas_update" on campanhas;
create policy "campanhas_update" on campanhas for update
  using (
    (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and status <> 'finalizada'
  )
  with check (
    get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[])
  );

drop policy "campanhas_delete" on campanhas;
create policy "campanhas_delete" on campanhas for delete
  using (
    (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and status <> 'finalizada'
  );

-- campanha_itens
create policy "campanha_itens_select" on campanha_itens for select
  using (get_minha_permissao('doacoes', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

create policy "campanha_itens_insert" on campanha_itens for insert
  with check (
    (get_minha_permissao('doacoes', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = campanha_id and c.status = 'finalizada')
  );

create policy "campanha_itens_update" on campanha_itens for update
  using (
    (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = campanha_itens.campanha_id and c.status = 'finalizada')
  );

create policy "campanha_itens_delete" on campanha_itens for delete
  using (
    (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = campanha_itens.campanha_id and c.status = 'finalizada')
  );

-- lancamentos_doacao_item
drop policy "lancamentos_insert" on lancamentos_doacao_item;
create policy "lancamentos_insert" on lancamentos_doacao_item for insert
  with check (
    (get_minha_permissao('doacoes', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = lancamentos_doacao_item.campanha_id and c.status = 'finalizada')
  );

drop policy "lancamentos_update" on lancamentos_doacao_item;
create policy "lancamentos_update" on lancamentos_doacao_item for update
  using (
    (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = lancamentos_doacao_item.campanha_id and c.status = 'finalizada')
  );

drop policy "lancamentos_delete" on lancamentos_doacao_item;
create policy "lancamentos_delete" on lancamentos_doacao_item for delete
  using (
    (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = lancamentos_doacao_item.campanha_id and c.status = 'finalizada')
  );

-- transacoes (campanha_id é nullable — transação sem campanha não é afetada)
drop policy "transacoes_insert" on transacoes;
create policy "transacoes_insert" on transacoes for insert
  with check (
    (get_minha_permissao('financeiro', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = transacoes.campanha_id and c.status = 'finalizada')
  );

drop policy "transacoes_update" on transacoes;
create policy "transacoes_update" on transacoes for update
  using (
    (get_minha_permissao('financeiro', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = transacoes.campanha_id and c.status = 'finalizada')
  );

drop policy "transacoes_delete" on transacoes;
create policy "transacoes_delete" on transacoes for delete
  using (
    (get_minha_permissao('financeiro', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
    and not exists (select 1 from campanhas c where c.id = transacoes.campanha_id and c.status = 'finalizada')
  );

-- documentos
drop policy "documentos_insert" on documentos;
create policy "documentos_insert" on documentos for insert
  with check (
    auth.uid() is not null
    and not exists (select 1 from campanhas c where c.id = documentos.campanha_id and c.status = 'finalizada')
  );

drop policy "documentos_delete" on documentos;
create policy "documentos_delete" on documentos for delete
  using (
    (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]) or enviado_por = auth.uid())
    and not exists (select 1 from campanhas c where c.id = documentos.campanha_id and c.status = 'finalizada')
  );

-- ---------------------------------------------------------------------------
-- 8. Views: vw_campanhas_resumo (agregada, sem item único) e
--    vw_campanha_itens_resumo (progresso por item).
-- ---------------------------------------------------------------------------
create view vw_campanhas_resumo as
select
  c.id,
  c.titulo,
  c.descricao,
  c.meta_financeira,
  c.status,
  c.data_inicio,
  c.data_fim,
  c.cor,
  c.finalizada_em,
  c.finalizada_por,
  c.criado_por,
  c.criado_em,
  c.atualizado_em,
  coalesce(it.total_itens, 0) as total_itens,
  coalesce(it.itens_completos, 0) as itens_completos,
  coalesce(tf.valor_arrecadado, 0) as valor_arrecadado,
  coalesce(tf.valor_gasto, 0) as valor_gasto,
  coalesce(tf.valor_arrecadado, 0) - coalesce(tf.valor_gasto, 0) as saldo_financeiro
from campanhas c
left join (
  select
    ci.campanha_id,
    count(*) as total_itens,
    count(*) filter (
      where ci.meta_quantidade > 0 and coalesce(l.quantidade_atual, 0) >= ci.meta_quantidade
    ) as itens_completos
  from campanha_itens ci
  left join (
    select campanha_item_id, sum(quantidade) as quantidade_atual
    from lancamentos_doacao_item group by campanha_item_id
  ) l on l.campanha_item_id = ci.id
  group by ci.campanha_id
) it on it.campanha_id = c.id
left join (
  select
    campanha_id,
    sum(valor) filter (where tipo = 'entrada') as valor_arrecadado,
    sum(valor) filter (where tipo = 'saida') as valor_gasto
  from transacoes
  where campanha_id is not null
  group by campanha_id
) tf on tf.campanha_id = c.id;

alter view vw_campanhas_resumo set (security_invoker = true);

create view vw_campanha_itens_resumo as
select
  ci.id,
  ci.campanha_id,
  ci.nome,
  ci.categoria,
  ci.unidade,
  ci.meta_quantidade,
  ci.criado_em,
  ci.atualizado_em,
  c.titulo as campanha_titulo,
  c.status as campanha_status,
  coalesce(l.quantidade_atual, 0) as quantidade_atual,
  greatest(0, ci.meta_quantidade - coalesce(l.quantidade_atual, 0)) as quantidade_faltante,
  case when ci.meta_quantidade > 0
    then round(coalesce(l.quantidade_atual, 0) / ci.meta_quantidade * 100)
    else 0
  end as progresso_percentual_bruto
from campanha_itens ci
join campanhas c on c.id = ci.campanha_id
left join (
  select campanha_item_id, sum(quantidade) as quantidade_atual
  from lancamentos_doacao_item group by campanha_item_id
) l on l.campanha_item_id = ci.id;

alter view vw_campanha_itens_resumo set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 9. RPC de reabertura — mesmo padrão de segurança de editar_membro_equipe /
--    deletar_membro_equipe (checa cargo, confirma senha via crypt()).
-- ---------------------------------------------------------------------------
create or replace function reabrir_campanha(
  p_caller_password text,
  p_campanha_id uuid,
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_cargo cargo_usuario;
  v_caller_encrypted_password text;
  v_status status_campanha;
begin
  if v_caller_id is null then
    raise exception 'Acesso não autorizado: usuário não autenticado.';
  end if;

  select cargo into v_caller_cargo from perfis where id = v_caller_id;

  if v_caller_cargo not in ('admin', 'admin_master') then
    raise exception 'Apenas administradores podem reabrir uma campanha finalizada.';
  end if;

  select status into v_status from campanhas where id = p_campanha_id;
  if v_status is null then
    raise exception 'Campanha não encontrada.';
  end if;
  if v_status <> 'finalizada' then
    raise exception 'Esta campanha não está finalizada.';
  end if;

  -- Guarda em variável `text` antes de comparar: encrypted_password é
  -- varchar(255) em auth.users, e crypt() só tem overload (text, text) —
  -- atribuir a uma variável text força o cast implícito corretamente
  -- (mesmo padrão já usado em editar_membro_equipe/deletar_membro_equipe).
  select encrypted_password into v_caller_encrypted_password from auth.users where id = v_caller_id;
  if v_caller_encrypted_password is null or v_caller_encrypted_password <> crypt(p_caller_password, v_caller_encrypted_password) then
    raise exception 'Senha de confirmação incorreta.';
  end if;

  update campanhas set status = 'ativa', atualizado_em = now() where id = p_campanha_id;

  insert into campanha_reaberturas (campanha_id, reaberta_por, motivo)
  values (p_campanha_id, v_caller_id, p_motivo);
end;
$$;

revoke execute on function reabrir_campanha(text, uuid, text) from anon;

-- ---------------------------------------------------------------------------
-- 10. Grants para os objetos novos (mesmo padrão de
--     20260721052215_grants_authenticated_role.sql).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on campanha_itens to anon, authenticated, service_role;
grant select on campanha_reaberturas to anon, authenticated, service_role;
grant select on vw_campanhas_resumo to anon, authenticated, service_role;
grant select on vw_campanha_itens_resumo to anon, authenticated, service_role;
