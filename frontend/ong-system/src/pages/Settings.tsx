import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Info, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { lerConfiguracao, salvarConfiguracao } from '../lib/services/configuracoes';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user, isAdmin, isAdminMaster } = useAuth();
  const podeEditar = isAdmin || isAdminMaster;

  const [nomeOng, setNomeOng] = useState('Ação Entre Amigos');
  const [tema, setTema] = useState(() => localStorage.getItem('theme') || 'light');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusConexao, setStatusConexao] = useState<'verificando' | 'ok' | 'erro'>('verificando');

  useEffect(() => {
    lerConfiguracao<string>('nome_organizacao')
      .then((valor) => { if (valor) setNomeOng(valor); })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    (async () => {
      try {
        const { error } = await supabase.from('configuracoes_sistema').select('chave').limit(1);
        setStatusConexao(error ? 'erro' : 'ok');
      } catch {
        setStatusConexao('erro');
      }
    })();
  }, []);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);

    localStorage.setItem('theme', tema);
    window.dispatchEvent(new Event('theme-change'));

    try {
      if (podeEditar) {
        await salvarConfiguracao('nome_organizacao', nomeOng, user.id);
      }
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as preferências gerais da plataforma da ONG.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <SettingsIcon className="w-4.5 h-4.5 text-primary" /> Geral
            </h3>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome da Organização</label>
                <input
                  type="text"
                  value={nomeOng}
                  onChange={(e) => setNomeOng(e.target.value)}
                  disabled={!podeEditar || loading}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
                />
                {!podeEditar && <p className="text-[11px] text-muted-foreground mt-1">Apenas administradores podem alterar o nome da organização.</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tema da Interface</label>
                <select
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                >
                  <option value="light">Claro (Padrão)</option>
                  <option value="dark">Escuro</option>
                  <option value="system">Seguir Sistema</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={salvando} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-60">
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                {sucesso && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Alterações salvas com sucesso!
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Info className="w-4.5 h-4.5 text-primary" /> Sobre o Sistema
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este sistema foi desenvolvido de forma personalizada para a ONG <strong>{nomeOng}</strong> para auxiliar no acompanhamento de campanhas de arrecadação, controle financeiro de caixa e gestão de voluntários e equipe interna.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-primary" /> Conexão com Banco
            </h3>

            {statusConexao === 'verificando' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                <span className="text-xs text-muted-foreground font-medium">Verificando conexão...</span>
              </div>
            )}
            {statusConexao === 'ok' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                <span className="text-xs text-green-800 font-bold">Conectado ao Supabase</span>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
            {statusConexao === 'erro' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> Falha ao conectar ao banco de dados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
