import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type CampanhaItem = Database['public']['Tables']['campanha_itens']['Row'];
export type CampanhaItemResumo = Database['public']['Views']['vw_campanha_itens_resumo']['Row'];
export type NovoCampanhaItem = Database['public']['Tables']['campanha_itens']['Insert'];

export async function listarItensDaCampanha(campanhaId: string): Promise<CampanhaItemResumo[]> {
  const { data, error } = await supabase
    .from('vw_campanha_itens_resumo')
    .select('*')
    .eq('campanha_id', campanhaId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Itens de campanhas ativas com menor progresso — usado no gráfico "Metas de Doação" da Visão Geral. */
export async function listarItensAtivosComMenorProgresso(limite = 4): Promise<CampanhaItemResumo[]> {
  const { data, error } = await supabase
    .from('vw_campanha_itens_resumo')
    .select('*')
    .eq('campanha_status', 'ativa')
    .order('progresso_percentual_bruto', { ascending: true })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}

export async function criarItensDaCampanha(itens: NovoCampanhaItem[]): Promise<CampanhaItem[]> {
  const { data, error } = await supabase.from('campanha_itens').insert(itens).select();
  if (error) throw error;
  return data ?? [];
}

export async function atualizarCampanhaItem(id: string, patch: Partial<CampanhaItem>) {
  const { data, error } = await supabase.from('campanha_itens').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function excluirCampanhaItem(id: string) {
  const { error } = await supabase.from('campanha_itens').delete().eq('id', id);
  if (error) throw error;
}
