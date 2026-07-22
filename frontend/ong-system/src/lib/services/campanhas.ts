import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type CampanhaResumo = Database['public']['Views']['vw_campanhas_resumo']['Row'];
export type Campanha = Database['public']['Tables']['campanhas']['Row'];
export type NovaCampanha = Database['public']['Tables']['campanhas']['Insert'];

/**
 * campanha_id é preenchido automaticamente por trigger a partir de
 * campanha_item_id — nunca deve ser enviado pelo cliente.
 */
export type NovoLancamentoItem = Omit<Database['public']['Tables']['lancamentos_doacao_item']['Insert'], 'campanha_id'>;

export async function listarCampanhas(): Promise<CampanhaResumo[]> {
  const { data, error } = await supabase
    .from('vw_campanhas_resumo')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function buscarCampanha(id: string): Promise<CampanhaResumo | null> {
  const { data, error } = await supabase
    .from('vw_campanhas_resumo')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function criarCampanha(campanha: NovaCampanha) {
  const { data, error } = await supabase.from('campanhas').insert(campanha).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarCampanha(id: string, patch: Partial<Campanha>) {
  const { data, error } = await supabase.from('campanhas').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function excluirCampanha(id: string) {
  const { error } = await supabase.from('campanhas').delete().eq('id', id);
  if (error) throw error;
}

/** Marca a campanha como finalizada — bloqueia (via RLS) qualquer novo dado relacionado a ela. */
export async function finalizarCampanha(id: string) {
  return atualizarCampanha(id, { status: 'finalizada' });
}

/**
 * Reabre uma campanha finalizada. Exige confirmação de senha do usuário
 * logado E que ele seja admin/admin_master — validado inteiramente no
 * banco (RPC security definer), nunca só no cliente.
 */
export async function reabrirCampanha(params: { senha: string; campanhaId: string; motivo?: string }) {
  const { error } = await supabase.rpc('reabrir_campanha', {
    p_caller_password: params.senha,
    p_campanha_id: params.campanhaId,
    p_motivo: params.motivo,
  });
  if (error) throw error;
}

/**
 * Lança um novo registro de item recebido para um item específico da
 * campanha (ledger append-only). O cast abaixo é seguro: `campanha_id` é
 * NOT NULL no banco mas preenchido por trigger a partir de
 * `campanha_item_id` antes do INSERT ser validado — o tipo gerado não sabe
 * disso e por isso ainda o marca como obrigatório.
 */
export async function lancarDoacaoItem(lancamento: NovoLancamentoItem) {
  const { data, error } = await supabase
    .from('lancamentos_doacao_item')
    .insert(lancamento as Database['public']['Tables']['lancamentos_doacao_item']['Insert'])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarLancamentosDaCampanha(campanhaId: string) {
  const { data, error } = await supabase
    .from('lancamentos_doacao_item')
    .select('*, campanha_itens(nome, unidade), doadores(nome)')
    .eq('campanha_id', campanhaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
