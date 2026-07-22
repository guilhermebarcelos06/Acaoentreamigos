import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type PrecoReferencia = Database['public']['Tables']['precos_referencia']['Row'];
export type NovoPrecoReferencia = Database['public']['Tables']['precos_referencia']['Insert'];

export const DIAS_PARA_DESATUALIZADO = 90;

export function precoEstaDesatualizado(atualizadoEm: string): boolean {
  const dias = (Date.now() - new Date(atualizadoEm).getTime()) / (1000 * 60 * 60 * 24);
  return dias > DIAS_PARA_DESATUALIZADO;
}

export async function listarPrecosReferencia(): Promise<PrecoReferencia[]> {
  const { data, error } = await supabase
    .from('precos_referencia')
    .select('*')
    .order('item_nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function criarOuAtualizarPrecoReferencia(preco: NovoPrecoReferencia) {
  const { data, error } = await supabase
    .from('precos_referencia')
    .upsert(preco, { onConflict: 'item_nome' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function excluirPrecoReferencia(id: string) {
  const { error } = await supabase.from('precos_referencia').delete().eq('id', id);
  if (error) throw error;
}
