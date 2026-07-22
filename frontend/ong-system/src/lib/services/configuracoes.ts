import { supabase } from '../supabase';

export async function lerConfiguracao<T = unknown>(chave: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select('valor')
    .eq('chave', chave)
    .maybeSingle();
  if (error) throw error;
  return (data?.valor as T) ?? null;
}

export async function salvarConfiguracao(chave: string, valor: unknown, atualizadoPor: string) {
  const { error } = await supabase
    .from('configuracoes_sistema')
    .upsert({ chave, valor: valor as never, atualizado_por: atualizadoPor, atualizado_em: new Date().toISOString() });
  if (error) throw error;
}
