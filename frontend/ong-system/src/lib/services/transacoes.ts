import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type Transacao = Database['public']['Tables']['transacoes']['Row'];
export type NovaTransacao = Database['public']['Tables']['transacoes']['Insert'];

export async function listarTransacoes(): Promise<Transacao[]> {
  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listarTransacoesDaCampanha(campanhaId: string): Promise<Transacao[]> {
  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('campanha_id', campanhaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarTransacao(transacao: NovaTransacao) {
  const { data, error } = await supabase.from('transacoes').insert(transacao).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarTransacao(id: string, patch: Partial<Transacao>) {
  const { data, error } = await supabase.from('transacoes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function excluirTransacao(id: string) {
  const { error } = await supabase.from('transacoes').delete().eq('id', id);
  if (error) throw error;
}

/** Faz upload do comprovante para o bucket 'recibos' e vincula à transação. */
export async function anexarRecibo(transacaoId: string, arquivo: File) {
  const path = `${transacaoId}/${Date.now()}-${arquivo.name}`;
  const { error: uploadError } = await supabase.storage.from('recibos').upload(path, arquivo);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('transacoes')
    .update({ tem_recibo: true, recibo_storage_path: path })
    .eq('id', transacaoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function urlAssinadaRecibo(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('recibos').createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
