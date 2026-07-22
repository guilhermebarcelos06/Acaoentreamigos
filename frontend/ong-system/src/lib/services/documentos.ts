import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type Documento = Database['public']['Tables']['documentos']['Row'];

export async function listarDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listarDocumentosDaCampanha(campanhaId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('campanha_id', campanhaId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function enviarDocumento(params: {
  nome: string;
  descricao: string;
  arquivo: File;
  enviadoPor: string;
  campanhaId?: string;
}) {
  const { nome, descricao, arquivo, enviadoPor, campanhaId } = params;
  const ext = arquivo.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('documentos').upload(path, arquivo);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      nome,
      descricao,
      storage_path: path,
      nome_original: arquivo.name,
      mime_type: arquivo.type || 'application/octet-stream',
      tamanho_bytes: arquivo.size,
      enviado_por: enviadoPor,
      campanha_id: campanhaId ?? null,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('documentos').remove([path]);
    throw error;
  }
  return data;
}

/**
 * Apaga a linha do banco primeiro, o arquivo do Storage depois: se a
 * campanha vinculada estiver finalizada, a RLS barra o DELETE da linha antes
 * de tocar no arquivo físico — evita um estado inconsistente onde o arquivo
 * já sumiu do Storage mas o metadado continua existindo.
 */
export async function excluirDocumento(documento: Documento) {
  const { error } = await supabase.from('documentos').delete().eq('id', documento.id);
  if (error) throw error;

  const { error: storageError } = await supabase.storage
    .from('documentos')
    .remove([documento.storage_path]);
  if (storageError) throw storageError;
}

export async function urlAssinadaDocumento(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
