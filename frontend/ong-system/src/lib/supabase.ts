import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios. Copie .env.example para .env.local e preencha os valores (locais via `supabase start` ou de produção).',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Tipos derivados do banco
export type CargoUsuario =
  | 'admin_master'
  | 'admin'
  | 'financeiro'
  | 'editor'
  | 'visualizador';

export type ModuloSistema =
  | 'visao_geral'
  | 'doacoes'
  | 'financeiro'
  | 'voluntarios'
  | 'configuracoes';

export interface Perfil {
  id: string;
  nome: string;
  cargo: CargoUsuario;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  // campo extra injetado pelo join com auth.users
  email?: string;
}

export interface PermissaoPerfil {
  id: string;
  perfil_id: string;
  modulo: ModuloSistema;
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

export type MapaPermissoes = Partial<Record<ModuloSistema, PermissaoPerfil>>;

export const CARGO_LABELS: Record<CargoUsuario, string> = {
  admin_master: 'Admin Master',
  admin: 'Administrador',
  financeiro: 'Financeiro',
  editor: 'Editor',
  visualizador: 'Visualizador',
};

export const CARGO_COLORS: Record<CargoUsuario, string> = {
  admin_master: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  financeiro: 'bg-green-100 text-green-700 border-green-200',
  editor: 'bg-amber-100 text-amber-700 border-amber-200',
  visualizador: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const MODULO_LABELS: Record<ModuloSistema, string> = {
  visao_geral: 'Visão Geral',
  doacoes: 'Doações',
  financeiro: 'Financeiro',
  voluntarios: 'Voluntários',
  configuracoes: 'Configurações',
};
