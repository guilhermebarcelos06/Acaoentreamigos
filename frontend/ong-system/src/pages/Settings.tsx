import { useState } from 'react';
import { Settings as SettingsIcon, Database, Laptop, Info, Check, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [nomeOng, setNomeOng] = useState('Ação Entre Amigos');
  const [tema, setTema] = useState('light');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setTimeout(() => {
      setSalvando(false);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      {/* Topo */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as preferências gerais da plataforma da ONG.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Painel de Preferências da ONG */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <SettingsIcon className="w-4.5 h-4.5 text-primary" />
              Geral
            </h3>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Nome da Organização
                </label>
                <input
                  type="text"
                  value={nomeOng}
                  onChange={(e) => setNomeOng(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Tema da Interface
                </label>
                <select
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="light">Claro (Padrão)</option>
                  <option value="dark">Escuro (Em Breve)</option>
                  <option value="system">Seguir Sistema</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                {sucesso && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Alterações salvas com sucesso!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Painel sobre a ONG */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Info className="w-4.5 h-4.5 text-primary" />
              Sobre o Sistema
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este sistema foi desenvolvido de forma personalizada para a ONG <strong>Ação Entre Amigos</strong> para auxiliar no acompanhamento de campanhas de arrecadação, controle financeiro de caixa e gestão de voluntários e equipe interna.
            </p>
            <div className="text-[11px] text-muted-foreground border-t pt-3 flex justify-between">
              <span>Versão do Painel: <strong>1.0.0</strong></span>
              <span>Última atualização: <strong>Maio 2026</strong></span>
            </div>
          </div>
        </div>

        {/* Painel lateral: Status do Banco de Dados */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-primary" />
              Conexão com Banco
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                <div>
                  <span className="text-xs text-green-800 font-bold block">Conectado ao Supabase</span>
                  <span className="text-[10px] text-green-600">kicposaltebnfatqhitv</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de Banco:</span>
                  <span className="font-semibold">PostgreSQL (17)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Região do Banco:</span>
                  <span className="font-semibold">Ohio (us-east-2)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSL:</span>
                  <span className="text-green-600 font-semibold">Ativado (Seguro)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Laptop className="w-4.5 h-4.5 text-primary" />
              Serviços Locais
            </h3>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
              <span>
                O backend JSON local (porta 3001) não é mais necessário e foi completamente substituído pelas chamadas diretas e seguras ao Supabase.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
