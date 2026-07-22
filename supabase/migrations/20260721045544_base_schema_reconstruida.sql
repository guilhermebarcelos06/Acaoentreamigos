-- =============================================================================
-- SCHEMA BASE (auth/RBAC) — ESPELHO EXATO DO QUE JÁ EXISTE EM PRODUÇÃO
-- =============================================================================
-- Confirmado via `list_tables`/`execute_sql` contra o projeto real
-- (kicposaltebnfatqhitv) em 2026-07-21: nomes de função, assinaturas, RLS
-- policies e triggers abaixo foram lidos diretamente de produção, não são
-- mais uma reconstrução especulativa.
-- =============================================================================

create extension if not exists pgcrypto;

create type cargo_usuario as enum ('admin_master', 'admin', 'financeiro', 'editor', 'visualizador');
create type modulo_sistema as enum ('visao_geral', 'doacoes', 'financeiro', 'voluntarios', 'configuracoes');

create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cargo cargo_usuario not null default 'visualizador',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists permissoes_perfil (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis(id) on delete cascade,
  modulo modulo_sistema not null,
  pode_ver boolean not null default false,
  pode_criar boolean not null default false,
  pode_editar boolean not null default false,
  pode_excluir boolean not null default false,
  unique (perfil_id, modulo)
);

alter table perfis enable row level security;
alter table permissoes_perfil enable row level security;

create or replace function handle_updated_at()
returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger set_perfis_updated_at before update on perfis
  for each row execute function handle_updated_at();

-- ---------------------------------------------------------------------------
-- Funções auxiliares de RBAC (usadas por todas as RLS policies do sistema)
-- ---------------------------------------------------------------------------
create or replace function get_meu_cargo()
returns cargo_usuario
language sql stable security definer
set search_path to 'public', 'pg_catalog' as $$
  select cargo from public.perfis where id = auth.uid();
$$;

create or replace function get_minha_permissao(p_modulo modulo_sistema, p_acao text)
returns boolean
language plpgsql stable security definer
set search_path to 'public', 'pg_catalog' as $$
declare
  resultado boolean := false;
begin
  case p_acao
    when 'ver' then
      select pode_ver into resultado from public.permissoes_perfil
      where perfil_id = auth.uid() and modulo = p_modulo;
    when 'criar' then
      select pode_criar into resultado from public.permissoes_perfil
      where perfil_id = auth.uid() and modulo = p_modulo;
    when 'editar' then
      select pode_editar into resultado from public.permissoes_perfil
      where perfil_id = auth.uid() and modulo = p_modulo;
    when 'excluir' then
      select pode_excluir into resultado from public.permissoes_perfil
      where perfil_id = auth.uid() and modulo = p_modulo;
    else
      resultado := false;
  end case;
  return coalesce(resultado, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: perfis / permissoes_perfil
-- ---------------------------------------------------------------------------
create policy "perfis_select" on perfis for select
  using (auth.uid() is not null);

create policy "perfis_insert" on perfis for insert
  with check (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]) or auth.uid() = id);

create policy "perfis_update_own" on perfis for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "perfis_update_admin" on perfis for update
  using (
    get_meu_cargo() = 'admin_master'
    or (get_meu_cargo() = 'admin' and cargo <> 'admin_master' and id <> auth.uid())
  );

create policy "perfis_delete" on perfis for delete
  using (get_meu_cargo() = 'admin_master' and id <> auth.uid() and cargo <> 'admin_master');

create policy "permissoes_select" on permissoes_perfil for select
  using (auth.uid() is not null);
create policy "permissoes_insert" on permissoes_perfil for insert
  with check (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "permissoes_update" on permissoes_perfil for update
  using (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));
create policy "permissoes_delete" on permissoes_perfil for delete
  using (get_meu_cargo() = any (array['admin_master','admin']::cargo_usuario[]));

-- ---------------------------------------------------------------------------
-- Permissões padrão por cargo, aplicadas automaticamente a cada novo perfil
-- ---------------------------------------------------------------------------
create or replace function criar_permissoes_padrao(p_perfil_id uuid, p_cargo cargo_usuario)
returns void
language plpgsql security definer
set search_path to 'public', 'pg_catalog' as $$
declare
  modulos modulo_sistema[] := array['visao_geral', 'doacoes', 'financeiro', 'voluntarios', 'configuracoes']::modulo_sistema[];
  m modulo_sistema;
begin
  foreach m in array modulos
  loop
    insert into public.permissoes_perfil (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
    values (
      p_perfil_id, m,
      case
        when p_cargo in ('admin_master', 'admin') then true
        when p_cargo = 'financeiro' and m in ('visao_geral', 'financeiro') then true
        when p_cargo = 'editor' and m in ('visao_geral', 'doacoes', 'voluntarios') then true
        when p_cargo = 'visualizador' and m in ('visao_geral', 'doacoes') then true
        else false
      end,
      case
        when p_cargo in ('admin_master', 'admin') then true
        when p_cargo = 'financeiro' and m = 'financeiro' then true
        when p_cargo = 'editor' and m in ('doacoes') then true
        else false
      end,
      case
        when p_cargo in ('admin_master', 'admin') then true
        when p_cargo = 'financeiro' and m = 'financeiro' then true
        when p_cargo = 'editor' and m in ('doacoes', 'voluntarios') then true
        else false
      end,
      case when p_cargo in ('admin_master', 'admin') then true else false end
    )
    on conflict (perfil_id, modulo) do nothing;
  end loop;
end;
$$;

create or replace function handle_new_perfil()
returns trigger
language plpgsql security definer
set search_path to 'public', 'pg_catalog' as $$
begin
  perform public.criar_permissoes_padrao(new.id, new.cargo);
  return new;
end;
$$;

drop trigger if exists on_perfil_created on perfis;
create trigger on_perfil_created
  after insert on perfis
  for each row execute function handle_new_perfil();

-- ---------------------------------------------------------------------------
-- Trigger: cria perfil automaticamente ao registrar um novo usuário no Auth.
-- Bloqueia escalonamento de privilégio: só um admin_master já autenticado
-- pode criar outro admin/admin_master; qualquer outro signup vira visualizador.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public', 'pg_catalog' as $$
declare
  v_caller_id uuid;
  v_caller_cargo text;
  v_desired_cargo text;
begin
  v_caller_id := auth.uid();
  v_desired_cargo := coalesce(new.raw_user_meta_data->>'cargo', 'visualizador');

  if v_desired_cargo in ('admin', 'admin_master') then
    if v_caller_id is not null then
      select cargo into v_caller_cargo from public.perfis where id = v_caller_id;
    end if;
    if v_caller_cargo is distinct from 'admin_master' then
      v_desired_cargo := 'visualizador';
    end if;
  end if;

  insert into public.perfis (id, nome, cargo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    v_desired_cargo::cargo_usuario
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: lista membros da equipe com email (join com auth.users)
-- ---------------------------------------------------------------------------
create or replace function listar_membros_equipe()
returns table (
  id uuid, nome text, cargo cargo_usuario, ativo boolean,
  criado_em timestamptz, atualizado_em timestamptz, email text
)
language sql security definer set search_path to 'public', 'pg_catalog' as $$
  select p.id, p.nome, p.cargo, p.ativo, p.criado_em, p.atualizado_em, u.email::text
  from public.perfis p join auth.users u on u.id = p.id
  order by p.criado_em asc;
$$;

-- ---------------------------------------------------------------------------
-- RPC: edita membro da equipe, exigindo confirmação de senha do chamador
-- ---------------------------------------------------------------------------
create or replace function editar_membro_equipe(
  p_caller_password text,
  p_target_user_id uuid,
  p_new_nome text,
  p_new_email text,
  p_new_cargo text,
  p_new_password text,
  p_permissoes jsonb
)
returns void
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_cargo cargo_usuario;
  v_caller_encrypted_password text;
  v_target_cargo cargo_usuario;
  v_perm record;
begin
  select cargo into v_caller_cargo from perfis where id = v_caller_id;
  select cargo into v_target_cargo from perfis where id = p_target_user_id;

  if v_caller_cargo not in ('admin', 'admin_master') then
    raise exception 'Apenas administradores podem editar membros da equipe.';
  end if;

  if (p_new_cargo in ('admin', 'admin_master') or v_target_cargo = 'admin_master')
     and v_caller_cargo <> 'admin_master' then
    raise exception 'Apenas o Admin Master possui privilégios para essa operação.';
  end if;

  select encrypted_password into v_caller_encrypted_password from auth.users where id = v_caller_id;
  if v_caller_encrypted_password is null or v_caller_encrypted_password <> crypt(p_caller_password, v_caller_encrypted_password) then
    raise exception 'Senha de confirmação incorreta.';
  end if;

  update perfis set nome = p_new_nome, cargo = p_new_cargo::cargo_usuario, atualizado_em = now()
  where id = p_target_user_id;

  if p_new_email is not null then
    update auth.users set email = p_new_email where id = p_target_user_id;
  end if;

  if length(coalesce(p_new_password, '')) > 0 then
    update auth.users set encrypted_password = crypt(p_new_password, gen_salt('bf'))
    where id = p_target_user_id;
  end if;

  delete from permissoes_perfil where perfil_id = p_target_user_id;
  for v_perm in select * from jsonb_to_recordset(p_permissoes)
    as x(modulo modulo_sistema, pode_ver boolean, pode_criar boolean, pode_editar boolean, pode_excluir boolean)
  loop
    insert into permissoes_perfil (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
    values (p_target_user_id, v_perm.modulo, v_perm.pode_ver, v_perm.pode_criar, v_perm.pode_editar, v_perm.pode_excluir);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: remove membro da equipe, exigindo confirmação de senha do chamador
-- ---------------------------------------------------------------------------
create or replace function deletar_membro_equipe(
  p_caller_password text,
  p_target_user_id uuid
)
returns void
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_cargo cargo_usuario;
  v_caller_encrypted_password text;
  v_target_cargo cargo_usuario;
begin
  select cargo into v_caller_cargo from perfis where id = v_caller_id;
  select cargo into v_target_cargo from perfis where id = p_target_user_id;

  if v_caller_cargo not in ('admin', 'admin_master') then
    raise exception 'Apenas administradores podem remover membros da equipe.';
  end if;

  if v_target_cargo = 'admin_master' then
    raise exception 'Não é possível remover o Admin Master do sistema.';
  end if;

  if v_target_cargo = 'admin' and v_caller_cargo <> 'admin_master' then
    raise exception 'Apenas o Admin Master pode remover um Administrador.';
  end if;

  select encrypted_password into v_caller_encrypted_password from auth.users where id = v_caller_id;
  if v_caller_encrypted_password is null or v_caller_encrypted_password <> crypt(p_caller_password, v_caller_encrypted_password) then
    raise exception 'Senha de confirmação incorreta.';
  end if;

  delete from auth.users where id = p_target_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC de bootstrap do primeiro admin_master. Uso único e manual (via SQL
-- direto/service_role) — nunca exposta via API (ver migration de grants).
-- ---------------------------------------------------------------------------
create or replace function promover_admin_master(p_email text)
returns text
language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_user_id uuid;
  v_count integer;
begin
  select count(*) into v_count from public.perfis where cargo = 'admin_master';
  if v_count > 0 then
    return 'ERRO: Já existe um Admin Master no sistema. Use a interface para gerenciar cargos.';
  end if;

  select id into v_user_id from auth.users where email = p_email limit 1;
  if v_user_id is null then
    return 'ERRO: Usuário não encontrado. Verifique o email.';
  end if;

  update public.perfis set cargo = 'admin_master', atualizado_em = now() where id = v_user_id;

  delete from public.permissoes_perfil where perfil_id = v_user_id;
  insert into public.permissoes_perfil (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
  select v_user_id, m::modulo_sistema, true, true, true, true
  from unnest(array['visao_geral','doacoes','financeiro','voluntarios','configuracoes']) as m;

  return 'SUCESSO: Usuário ' || p_email || ' promovido a Admin Master!';
end;
$$;

revoke execute on function promover_admin_master(text) from anon, authenticated, public;
