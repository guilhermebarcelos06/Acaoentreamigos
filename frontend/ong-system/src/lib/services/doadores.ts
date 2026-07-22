import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type Doador = Database['public']['Tables']['doadores']['Row'];

export async function listarDoadores(): Promise<Doador[]> {
  const { data, error } = await supabase.from('doadores').select('*').order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function buscarOuCriarDoadorPorNome(nome: string): Promise<Doador> {
  const { data: existente, error: buscaError } = await supabase
    .from('doadores')
    .select('*')
    .ilike('nome', nome)
    .maybeSingle();
  if (buscaError) throw buscaError;
  if (existente) return existente;

  const { data, error } = await supabase
    .from('doadores')
    .insert({ nome, origem: 'manual' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
