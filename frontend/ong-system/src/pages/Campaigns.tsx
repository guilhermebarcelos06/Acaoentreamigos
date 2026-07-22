import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, CheckCircle2, Plus, Trash2, Search, X, Calendar, AlertTriangle, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { listarCampanhas, criarCampanha, excluirCampanha, type CampanhaResumo } from "../lib/services/campanhas";
import { criarItensDaCampanha } from "../lib/services/campanhaItens";
import { listarPrecosReferencia, type PrecoReferencia } from "../lib/services/precosReferencia";
import { formatDateBR } from "../lib/dates";

const CATEGORIAS = ["ALIMENTOS", "VESTUÁRIO", "INFANTIL", "HIGIENE", "OUTRO"];

interface ItemForm {
  nome: string;
  categoria: string;
  unidade: string;
  meta_quantidade: string;
}

function novoItemVazio(): ItemForm {
  return { nome: "", categoria: "ALIMENTOS", unidade: "unidades", meta_quantidade: "" };
}

function getRemainingDays(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const fim = new Date(dataFim + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = fim.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function Campaigns() {
  const navigate = useNavigate();
  const { user, podeFazer, isAdmin, isAdminMaster } = useAuth();
  const [campaignList, setCampaignList] = useState<CampanhaResumo[]>([]);
  const [precosRef, setPrecosRef] = useState<PrecoReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const podeCriar = isAdmin || isAdminMaster || podeFazer('doacoes', 'criar');

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState("");
  const [metaFinanceira, setMetaFinanceira] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([novoItemVazio()]);
  const [dropdownAbertoIdx, setDropdownAbertoIdx] = useState<number | null>(null);

  const carregar = () => {
    setLoading(true);
    listarCampanhas()
      .then(setCampaignList)
      .catch((err) => console.error("Erro ao carregar campanhas:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    listarPrecosReferencia().then(setPrecosRef).catch((err) => console.error("Erro ao carregar preços de referência:", err));
  }, []);

  const filteredCampaigns = campaignList.filter((c) =>
    (c.titulo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setDataInicio(new Date().toISOString().slice(0, 10));
    setDataFim("");
    setMetaFinanceira("");
    setItens([novoItemVazio()]);
    setErrorMsg("");
  };

  const handleAddItemRow = () => setItens([...itens, novoItemVazio()]);
  const handleRemoveItemRow = (idx: number) => setItens(itens.filter((_, i) => i !== idx));
  const handleItemChange = (idx: number, patch: Partial<ItemForm>) => {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  // Sugestões do item: só da mesma categoria selecionada na linha, filtradas
  // pelo texto digitado (mostra todas da categoria quando o campo está vazio).
  const sugestoesParaItem = (item: ItemForm): PrecoReferencia[] => {
    const termo = item.nome.trim().toLowerCase();
    return precosRef.filter((p) => p.categoria === item.categoria && (termo === "" || p.item_nome.toLowerCase().includes(termo)));
  };

  const handleSelecionarSugestao = (idx: number, p: PrecoReferencia) => {
    setItens(itens.map((it, i) => (i === idx ? { ...it, nome: p.item_nome, categoria: p.categoria, unidade: p.unidade } : it)));
    setDropdownAbertoIdx(null);
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const itensValidos = itens.filter((it) => it.nome.trim());
    if (itensValidos.length === 0) {
      setErrorMsg("Adicione ao menos um item à campanha.");
      return;
    }

    setSaving(true);
    let novaCampanhaId: string | null = null;
    try {
      const novaCampanha = await criarCampanha({
        titulo,
        descricao: descricao || null,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        meta_financeira: metaFinanceira ? parseFloat(metaFinanceira) : null,
        cor: "bg-blue-500",
        criado_por: user?.id,
      });
      novaCampanhaId = novaCampanha.id;

      await criarItensDaCampanha(
        itensValidos.map((it) => ({
          campanha_id: novaCampanha.id,
          nome: it.nome,
          categoria: it.categoria,
          unidade: it.unidade,
          meta_quantidade: parseFloat(it.meta_quantidade) || 0,
        })),
      );

      setIsModalOpen(false);
      resetForm();
      carregar();
    } catch (err: any) {
      // Se os itens falharem depois da campanha já criada, desfaz a campanha
      // pra não deixar uma campanha "vazia" órfã no meio do caminho.
      if (novaCampanhaId) {
        await excluirCampanha(novaCampanhaId).catch(() => {});
      }
      setErrorMsg(err.message || "Erro ao criar campanha.");
    } finally {
      setSaving(false);
    }
  };

  const campanhasAtivas = campaignList.filter((c) => c.status === 'ativa' && c.data_fim);
  const redCampaigns = campanhasAtivas.filter((c) => {
    const days = getRemainingDays(c.data_fim);
    return days !== null && days <= 7;
  });
  const yellowCampaigns = campanhasAtivas.filter((c) => {
    const days = getRemainingDays(c.data_fim);
    return days !== null && days > 7 && days <= 14;
  });

  const statusBadge = (status: string | null) => {
    if (status === 'finalizada') return { label: 'Finalizada', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
    if (status === 'cancelada') return { label: 'Cancelada', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' };
    return { label: 'Ativa', className: 'bg-primary/10 text-primary' };
  };

  return (
    <div className="space-y-6 font-sans text-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Múltiplos itens de doação e financeiro consolidados por campanha.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full sm:w-48 bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          {podeCriar && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Campanha
            </button>
          )}
        </div>
      </div>

      {(redCampaigns.length > 0 || yellowCampaigns.length > 0) && (
        <div className="space-y-3">
          {redCampaigns.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 shadow-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">Alerta Crítico: Campanhas com prazo urgente ou vencido!</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {redCampaigns.map((c) => {
                    const days = getRemainingDays(c.data_fim);
                    return (
                      <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900">
                        <Calendar className="w-3 h-3" />
                        {c.titulo}: {days !== null && days < 0 ? `Vencida há ${Math.abs(days)}d` : days === 0 ? "Vence hoje!" : `Falta ${days}d`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {yellowCampaigns.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 shadow-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">Atenção: Campanhas se aproximando do prazo limite</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {yellowCampaigns.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      <Calendar className="w-3 h-3" />
                      {c.titulo}: Faltam {getRemainingDays(c.data_fim)}d
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Carregando campanhas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => {
            const days = getRemainingDays(campaign.data_fim);
            const badge = statusBadge(campaign.status);
            const totalItens = campaign.total_itens ?? 0;
            const itensCompletos = campaign.itens_completos ?? 0;
            const progressoGeral = totalItens > 0 ? Math.round((itensCompletos / totalItens) * 100) : 0;

            let borderStyle = "border-border";
            let alertLabel = null;
            if (campaign.status === 'ativa' && days !== null) {
              if (days <= 7) {
                borderStyle = "border-red-500/40 dark:border-red-500/20 ring-1 ring-red-500/20";
                alertLabel = <span className="absolute top-6 right-6 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-950/50 px-2 py-1 rounded border border-red-200 dark:border-red-900">{days < 0 ? "VENCIDO" : "CRÍTICO"}</span>;
              } else if (days <= 14) {
                borderStyle = "border-amber-500/40 dark:border-amber-500/20 ring-1 ring-amber-500/20";
                alertLabel = <span className="absolute top-6 right-6 text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-950/50 px-2 py-1 rounded border border-amber-200 dark:border-amber-900">ATENÇÃO</span>;
              }
            }

            return (
              <button
                key={campaign.id}
                onClick={() => navigate(`/campanhas/${campaign.id}`)}
                className={`text-left bg-card border rounded-2xl p-6 shadow-sm flex flex-col relative transition-all duration-300 hover:shadow-md ${borderStyle}`}
              >
                {alertLabel}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${campaign.status === 'finalizada' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : progressoGeral >= 100 ? 'bg-primary/10 text-primary' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-500'}`}>
                    {campaign.status === 'finalizada' ? <Lock className="w-5 h-5" /> : progressoGeral >= 100 ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{campaign.titulo}</h3>
                    <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                  </div>
                </div>

                <div className="mb-2 flex justify-between items-end">
                  <div>
                    <span className="text-xl font-bold">{itensCompletos}</span>
                    <span className="text-sm text-muted-foreground"> de {totalItens} itens completos</span>
                  </div>
                </div>

                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mb-4">
                  <div className={`h-full ${campaign.cor} rounded-full`} style={{ width: `${Math.min(100, progressoGeral)}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-xs pt-4 border-t border-dashed mt-auto">
                  <div>
                    <p className="text-muted-foreground">Período</p>
                    <p className="font-medium text-foreground">
                      {campaign.data_inicio ? formatDateBR(campaign.data_inicio) : '—'}
                      {campaign.data_fim ? ` a ${formatDateBR(campaign.data_fim)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Saldo financeiro</p>
                    <p className="font-semibold text-foreground">
                      R$ {(campaign.saldo_financeiro ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
              Nenhuma campanha encontrada.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-xl p-6 rounded-2xl border shadow-lg relative text-foreground max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Nova Campanha</h2>
            <form onSubmit={handleAddCampaign} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground" placeholder="Ex: Doações para Órfãos" />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data Início</label>
                  <input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium">Data Fim</label>
                  <input type="date" required min={dataInicio} value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Meta Financeira (opcional, R$)</label>
                <input type="number" min={0} step="0.01" value={metaFinanceira} onChange={(e) => setMetaFinanceira(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground" placeholder="Ex: 5000.00" />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Itens da campanha</label>
                  <button type="button" onClick={handleAddItemRow} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar item
                  </button>
                </div>
                <div className="space-y-3">
                  {itens.map((item, idx) => {
                    const sugestoes = sugestoesParaItem(item);
                    return (
                    <div key={idx} className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:items-center bg-muted/20 p-2 rounded-lg">
                      <div className="sm:col-span-4 relative">
                        <input type="text" placeholder="Nome (ex: Óleo)" value={item.nome}
                          onChange={(e) => { handleItemChange(idx, { nome: e.target.value }); setDropdownAbertoIdx(idx); }}
                          onFocus={() => setDropdownAbertoIdx(idx)}
                          onBlur={() => setTimeout(() => setDropdownAbertoIdx((cur) => (cur === idx ? null : cur)), 150)}
                          autoComplete="off"
                          className="w-full px-2 py-1.5 border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                        {dropdownAbertoIdx === idx && sugestoes.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {sugestoes.map((p) => (
                              <button key={p.id} type="button" onMouseDown={() => handleSelecionarSugestao(idx, p)}
                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted/60 truncate">
                                {p.item_nome} <span className="text-muted-foreground">· {p.unidade}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:contents">
                        <select value={item.categoria} onChange={(e) => handleItemChange(idx, { categoria: e.target.value })}
                          className="col-span-1 sm:col-span-3 px-2 py-1.5 border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="text" placeholder="Unidade" value={item.unidade} onChange={(e) => handleItemChange(idx, { unidade: e.target.value })}
                          className="col-span-1 sm:col-span-2 px-2 py-1.5 border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                        <input type="number" min={0} placeholder="Meta" value={item.meta_quantidade} onChange={(e) => handleItemChange(idx, { meta_quantidade: e.target.value })}
                          className="col-span-1 sm:col-span-2 px-2 py-1.5 border rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} disabled={itens.length === 1}
                        className="sm:col-span-1 flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded p-1.5 disabled:opacity-30 text-xs font-medium">
                        <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="sm:hidden">Remover item</span>
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50 text-foreground bg-card">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
