-- =============================================================================
-- DOMÍNIO: PREÇOS DE REFERÊNCIA, VOLUNTÁRIOS, DOCUMENTOS, CONFIGURAÇÕES,
-- IMPORTAÇÃO (AUDITORIA)
-- =============================================================================

create type status_voluntario as enum ('ativo', 'inativo', 'novo');
create type status_import_lote as enum ('processando', 'concluido', 'com_erros');

-- ---------------------------------------------------------------------------
-- Preços de referência (para estimar valor de itens doados em espécie)
-- ---------------------------------------------------------------------------
create table precos_referencia (
  id uuid primary key default gen_random_uuid(),
  item_nome text not null,
  categoria text not null,
  unidade text not null,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  fonte text not null default 'manual',
  atualizado_por uuid references perfis(id),
  atualizado_em timestamptz not null default now()
);

create unique index precos_referencia_item_uniq on precos_referencia (lower(item_nome));

alter table precos_referencia enable row level security;

create policy "precos_referencia_select" on precos_referencia for select
  using (auth.uid() is not null);
create policy "precos_referencia_all_admin" on precos_referencia for all
  using (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
  with check (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

create trigger set_precos_referencia_updated_at before update on precos_referencia
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- Voluntários
-- ---------------------------------------------------------------------------
create table voluntarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  habilidades text,
  status status_voluntario not null default 'novo',
  data_inscricao date not null default current_date,
  criado_em timestamptz not null default now()
);

alter table voluntarios enable row level security;

create policy "voluntarios_select" on voluntarios for select
  using (get_minha_permissao('voluntarios', 'ver') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "voluntarios_insert" on voluntarios for insert
  with check (get_minha_permissao('voluntarios', 'criar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "voluntarios_update" on voluntarios for update
  using (get_minha_permissao('voluntarios', 'editar') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "voluntarios_delete" on voluntarios for delete
  using (get_minha_permissao('voluntarios', 'excluir') or get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

-- ---------------------------------------------------------------------------
-- Documentos (metadados; arquivo físico vai para o Storage bucket 'documentos')
-- ---------------------------------------------------------------------------
create table documentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  storage_path text not null,
  nome_original text not null,
  mime_type text not null,
  tamanho_bytes bigint not null,
  enviado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

alter table documentos enable row level security;

create policy "documentos_select" on documentos for select using (auth.uid() is not null);
create policy "documentos_insert" on documentos for insert with check (auth.uid() is not null);
create policy "documentos_delete" on documentos for delete
  using (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]) or enviado_por = auth.uid());

-- ---------------------------------------------------------------------------
-- Configurações do sistema (chave/valor) — nome da ONG, URL do form de voluntários etc.
-- ---------------------------------------------------------------------------
create table configuracoes_sistema (
  chave text primary key,
  valor jsonb not null,
  atualizado_por uuid references perfis(id),
  atualizado_em timestamptz not null default now()
);

alter table configuracoes_sistema enable row level security;

create policy "configuracoes_select" on configuracoes_sistema for select using (auth.uid() is not null);
create policy "configuracoes_all_admin" on configuracoes_sistema for all
  using (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]))
  with check (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

insert into configuracoes_sistema (chave, valor) values
  ('nome_organizacao', '"Ação Entre Amigos"'),
  ('voluntarios_form_url', 'null');

-- ---------------------------------------------------------------------------
-- Auditoria de importação (banco de doações do Rodrigo e futuras importações)
-- ---------------------------------------------------------------------------
create table import_lotes (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  mapeamento_colunas jsonb not null,
  status status_import_lote not null default 'processando',
  total_linhas int not null default 0,
  total_sucesso int not null default 0,
  total_erro int not null default 0,
  importado_por uuid references perfis(id),
  importado_em timestamptz not null default now()
);

create table import_erros (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references import_lotes(id) on delete cascade,
  linha_numero int not null,
  erro_msg text not null,
  dados_brutos jsonb not null
);

alter table import_lotes enable row level security;
alter table import_erros enable row level security;

create policy "import_lotes_admin_master" on import_lotes
  for all using (get_meu_cargo() = 'admin_master') with check (get_meu_cargo() = 'admin_master');
create policy "import_erros_admin_master" on import_erros
  for all using (get_meu_cargo() = 'admin_master') with check (get_meu_cargo() = 'admin_master');

-- ---------------------------------------------------------------------------
-- Storage buckets: documentos e recibos (privados, acesso via signed URL)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('recibos', 'recibos', false)
on conflict (id) do nothing;

create policy "storage_documentos_select" on storage.objects
  for select using (bucket_id = 'documentos' and auth.uid() is not null);
create policy "storage_documentos_insert" on storage.objects
  for insert with check (bucket_id = 'documentos' and auth.uid() is not null);
create policy "storage_documentos_delete" on storage.objects
  for delete using (bucket_id = 'documentos' and auth.uid() is not null);

create policy "storage_recibos_select" on storage.objects
  for select using (bucket_id = 'recibos' and get_minha_permissao('financeiro', 'ver'));
create policy "storage_recibos_insert" on storage.objects
  for insert with check (bucket_id = 'recibos' and get_minha_permissao('financeiro', 'criar'));
create policy "storage_recibos_delete" on storage.objects
  for delete using (bucket_id = 'recibos' and get_minha_permissao('financeiro', 'excluir'));
