-- =============================================================================
-- DOMÍNIO: DOADORES, CAMPANHAS, LANÇAMENTOS DE ITEM E TRANSAÇÕES FINANCEIRAS
-- =============================================================================

create type origem_doador as enum ('manual', 'import_rodrigo', 'formulario');
create type status_campanha as enum ('ativa', 'concluida', 'cancelada');
create type tipo_transacao as enum ('entrada', 'saida');

-- ---------------------------------------------------------------------------
-- Doadores
-- ---------------------------------------------------------------------------
create table doadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  email text,
  telefone text,
  origem origem_doador not null default 'manual',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index doadores_documento_uniq on doadores (documento) where documento is not null;

alter table doadores enable row level security;

create policy "doadores_select" on doadores for select
  using (get_minha_permissao('doacoes', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "doadores_insert" on doadores for insert
  with check (get_minha_permissao('doacoes', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "doadores_update" on doadores for update
  using (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "doadores_delete" on doadores for delete
  using (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

create trigger set_doadores_updated_at before update on doadores
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- Campanhas (entidade guarda-chuva: metas de itens + financeiro vinculado)
-- ---------------------------------------------------------------------------
create table campanhas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  descricao text,
  unidade text not null,
  meta_quantidade numeric(12,2) not null default 0 check (meta_quantidade >= 0),
  meta_financeira numeric(12,2) check (meta_financeira >= 0),
  status status_campanha not null default 'ativa',
  data_inicio date not null default current_date,
  prazo_limite date,
  cor text not null default 'bg-blue-500',
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table campanhas enable row level security;

create policy "campanhas_select" on campanhas for select
  using (get_minha_permissao('doacoes', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "campanhas_insert" on campanhas for insert
  with check (get_minha_permissao('doacoes', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "campanhas_update" on campanhas for update
  using (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "campanhas_delete" on campanhas for delete
  using (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

create trigger set_campanhas_updated_at before update on campanhas
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- Lançamentos de item (ledger append-only — nunca sobrescreve um "current")
-- ---------------------------------------------------------------------------
create table lancamentos_doacao_item (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  quantidade numeric(12,2) not null check (quantidade <> 0),
  doador_id uuid references doadores(id),
  data date not null default current_date,
  observacao text,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

create index lancamentos_doacao_item_campanha_idx on lancamentos_doacao_item (campanha_id);

alter table lancamentos_doacao_item enable row level security;

create policy "lancamentos_select" on lancamentos_doacao_item for select
  using (get_minha_permissao('doacoes', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "lancamentos_insert" on lancamentos_doacao_item for insert
  with check (get_minha_permissao('doacoes', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "lancamentos_update" on lancamentos_doacao_item for update
  using (get_minha_permissao('doacoes', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "lancamentos_delete" on lancamentos_doacao_item for delete
  using (get_minha_permissao('doacoes', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

-- ---------------------------------------------------------------------------
-- Transações financeiras (valor numérico real, nunca string formatada)
-- ---------------------------------------------------------------------------
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  descricao text not null,
  tipo tipo_transacao not null,
  valor numeric(12,2) not null check (valor > 0),
  campanha_id uuid references campanhas(id),
  doador_id uuid references doadores(id),
  tem_recibo boolean not null default false,
  recibo_storage_path text,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index transacoes_campanha_idx on transacoes (campanha_id);
create index transacoes_data_idx on transacoes (data);

alter table transacoes enable row level security;

create policy "transacoes_select" on transacoes for select
  using (get_minha_permissao('financeiro', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "transacoes_insert" on transacoes for insert
  with check (get_minha_permissao('financeiro', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "transacoes_update" on transacoes for update
  using (get_minha_permissao('financeiro', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "transacoes_delete" on transacoes for delete
  using (get_minha_permissao('financeiro', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

create trigger set_transacoes_updated_at before update on transacoes
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- View: resumo de campanha SEMPRE calculado a partir do ledger.
-- Elimina o bug histórico de progresso negativo / >100% gravado incorretamente.
-- ---------------------------------------------------------------------------
create view vw_campanhas_resumo as
select
  c.id,
  c.titulo,
  c.categoria,
  c.descricao,
  c.unidade,
  c.meta_quantidade,
  c.meta_financeira,
  c.status,
  c.data_inicio,
  c.prazo_limite,
  c.cor,
  c.criado_por,
  c.criado_em,
  c.atualizado_em,
  coalesce(li.quantidade_atual, 0) as quantidade_atual,
  greatest(0, c.meta_quantidade - coalesce(li.quantidade_atual, 0)) as quantidade_faltante,
  case when c.meta_quantidade > 0
    then round(coalesce(li.quantidade_atual, 0) / c.meta_quantidade * 100)
    else 0
  end as progresso_percentual_bruto,
  coalesce(tf.valor_arrecadado, 0) as valor_arrecadado,
  coalesce(tf.valor_gasto, 0) as valor_gasto,
  coalesce(tf.valor_arrecadado, 0) - coalesce(tf.valor_gasto, 0) as saldo_financeiro
from campanhas c
left join (
  select campanha_id, sum(quantidade) as quantidade_atual
  from lancamentos_doacao_item
  group by campanha_id
) li on li.campanha_id = c.id
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
