import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type Voluntario = Database['public']['Tables']['voluntarios']['Row'];
export type NovoVoluntario = Database['public']['Tables']['voluntarios']['Insert'];

export async function listarVoluntarios(): Promise<Voluntario[]> {
  const { data, error } = await supabase
    .from('voluntarios')
    .select('*')
    .order('data_inscricao', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarVoluntario(voluntario: NovoVoluntario) {
  const { data, error } = await supabase.from('voluntarios').insert(voluntario).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarVoluntario(id: string, patch: Partial<Voluntario>) {
  const { data, error } = await supabase.from('voluntarios').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function excluirVoluntario(id: string) {
  const { error } = await supabase.from('voluntarios').delete().eq('id', id);
  if (error) throw error;
}
