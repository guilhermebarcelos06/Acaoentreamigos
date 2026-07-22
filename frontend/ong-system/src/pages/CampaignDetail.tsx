import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, DollarSign, Package, FileDown, Tag, Lock, Unlock,
  FileText, UploadCloud, Trash2, Eye, X, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  buscarCampanha, lancarDoacaoItem, listarLancamentosDaCampanha,
  finalizarCampanha, reabrirCampanha, type CampanhaResumo,
} from "../lib/services/campanhas";
import { listarItensDaCampanha, type CampanhaItemResumo } from "../lib/services/campanhaItens";
import { listarTransacoesDaCampanha, criarTransacao, type Transacao } from "../lib/services/transacoes";
import { listarPrecosReferencia, type PrecoReferencia } from "../lib/services/precosReferencia";
import {
  listarDocumentosDaCampanha, enviarDocumento, excluirDocumento, urlAssinadaDocumento, type Documento,
} from "../lib/services/documentos";
import { formatCurrencyInputMask, parseBRLInput, formatBRLWithSymbol } from "../lib/currency";
import { formatDateBR } from "../lib/dates";
import { gerarPdfItensFaltantes } from "../lib/pdf/campanhaItensFaltantesPdf";
import { gerarPdfResumoCampanha } from "../lib/pdf/campanhaResumoPdf";
import { gerarExtratoCampanhaPdf } from "../lib/pdf/campanhaExtratoPdf";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, podeFazer, isAdmin, isAdminMaster } = useAuth();

  const [campanha, setCampanha] = useState<CampanhaResumo | null>(null);
  const [itens, setItens] = useState<CampanhaItemResumo[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [precos, setPrecos] = useState<PrecoReferencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemAlvo, setItemAlvo] = useState<CampanhaItemResumo | null>(null);
  const [itemQuantidade, setItemQuantidade] = useState("");
  const [itemObs, setItemObs] = useState("");

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txDescricao, setTxDescricao] = useState("");
  const [txTipo, setTxTipo] = useState<'entrada' | 'saida'>('entrada');
  const [txValor, setTxValor] = useState("");

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docNome, setDocNome] = useState("");
  const [docDescricao, setDocDescricao] = useState("");
  const [docArquivo, setDocArquivo] = useState<File | null>(null);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);

  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [reabrirSenha, setReabrirSenha] = useState("");
  const [reabrirMotivo, setReabrirMotivo] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const podeEditarDoacoes = isAdmin || isAdminMaster || podeFazer('doacoes', 'editar');
  const podeCriarFinanceiro = isAdmin || isAdminMaster || podeFazer('financeiro', 'criar');
  const podeReabrir = isAdmin || isAdminMaster;
  const campanhaAtiva = campanha?.status === 'ativa';

  const carregar = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      buscarCampanha(id),
      listarItensDaCampanha(id),
      listarLancamentosDaCampanha(id),
      listarTransacoesDaCampanha(id),
      listarDocumentosDaCampanha(id),
      listarPrecosReferencia(),
    ])
      .then(([c, i, l, t, d, p]) => {
        setCampanha(c);
        setItens(i);
        setLancamentos(l);
        setTransacoes(t);
        setDocumentos(d);
        setPrecos(p);
      })
      .catch((err) => console.error("Erro ao carregar campanha:", err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleLancarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemAlvo) return;
    setErrorMsg("");
    setSaving(true);
    try {
      await lancarDoacaoItem({
        campanha_item_id: itemAlvo.id!,
        quantidade: parseFloat(itemQuantidade) || 0,
        observacao: itemObs || null,
        criado_por: user?.id,
      });
      setItemAlvo(null);
      setItemQuantidade("");
      setItemObs("");
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao lançar item.");
    } finally {
      setSaving(false);
    }
  };

  const handleLancarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campanha) return;
    setErrorMsg("");
    setSaving(true);
    try {
      await criarTransacao({
        descricao: txDescricao,
        tipo: txTipo,
        valor: parseBRLInput(txValor),
        campanha_id: campanha.id!,
        criado_por: user?.id,
      });
      setIsTxModalOpen(false);
      setTxDescricao("");
      setTxValor("");
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao lançar transação.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docArquivo || !campanha || !user) return;
    setErrorMsg("");
    setSaving(true);
    try {
      await enviarDocumento({
        nome: docNome,
        descricao: docDescricao,
        arquivo: docArquivo,
        enviadoPor: user.id,
        campanhaId: campanha.id!,
      });
      setIsDocModalOpen(false);
      setDocNome("");
      setDocDescricao("");
      setDocArquivo(null);
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao enviar documento.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirDocumento = async (documento: Documento) => {
    try {
      await excluirDocumento(documento);
      setIsDeletingDocId(null);
      carregar();
    } catch (err: any) {
      alert(err.message || "Falha ao excluir o documento. A campanha pode estar finalizada.");
    }
  };

  const handleAbrirDocumento = async (path: string) => {
    try {
      const url = await urlAssinadaDocumento(path);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar link do documento.");
    }
  };

  const handleFinalizar = async () => {
    if (!campanha) return;
    setErrorMsg("");
    setSaving(true);
    try {
      await finalizarCampanha(campanha.id!);
      setIsFinalizarModalOpen(false);
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao finalizar campanha.");
    } finally {
      setSaving(false);
    }
  };

  const handleReabrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campanha) return;
    setErrorMsg("");
    setSaving(true);
    try {
      await reabrirCampanha({ senha: reabrirSenha, campanhaId: campanha.id!, motivo: reabrirMotivo || undefined });
      setIsReabrirModalOpen(false);
      setReabrirSenha("");
      setReabrirMotivo("");
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message?.includes("Senha") ? "Senha de confirmação incorreta." : (err.message || "Erro ao reabrir campanha."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Carregando campanha...</div>;
  }

  if (!campanha) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm mb-4">Campanha não encontrada.</p>
        <button onClick={() => navigate('/campanhas')} className="text-primary text-sm font-medium hover:underline">Voltar para campanhas</button>
      </div>
    );
  }

  const statusLabel = campanha.status === 'finalizada' ? 'Finalizada' : campanha.status === 'cancelada' ? 'Cancelada' : 'Ativa';
  const totalItens = campanha.total_itens ?? 0;
  const itensCompletos = campanha.itens_completos ?? 0;

  return (
    <div className="space-y-6 font-sans text-foreground">
      <button onClick={() => navigate('/campanhas')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{campanha.titulo}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${campanha.status === 'finalizada' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : campanha.status === 'cancelada' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {campanha.data_inicio ? formatDateBR(campanha.data_inicio) : '—'}
            {campanha.data_fim ? ` a ${formatDateBR(campanha.data_fim)}` : ''}
          </p>
          {campanha.descricao && <p className="text-sm text-muted-foreground mt-1 max-w-xl break-words">{campanha.descricao}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => gerarPdfItensFaltantes(campanha, itens)} className="flex items-center gap-2 px-3 py-2 border rounded-md font-medium text-xs hover:bg-muted/50 bg-card text-foreground">
            <FileDown className="w-3.5 h-3.5" /> PDF Itens Faltantes
          </button>
          <button onClick={() => gerarPdfResumoCampanha(campanha, itens, lancamentos, transacoes)} className="flex items-center gap-2 px-3 py-2 border rounded-md font-medium text-xs hover:bg-muted/50 bg-card text-foreground">
            <FileDown className="w-3.5 h-3.5" /> PDF Resumo
          </button>
          <button onClick={() => gerarExtratoCampanhaPdf(campanha, transacoes)} className="flex items-center gap-2 px-3 py-2 border rounded-md font-medium text-xs hover:bg-muted/50 bg-card text-foreground">
            <FileDown className="w-3.5 h-3.5" /> Extrato Financeiro
          </button>
          {campanhaAtiva && podeEditarDoacoes && (
            <button onClick={() => { setErrorMsg(""); setIsFinalizarModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 border border-amber-300 dark:border-amber-900 rounded-md font-medium text-xs hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-card text-amber-700 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" /> Finalizar Campanha
            </button>
          )}
          {campanha.status === 'finalizada' && podeReabrir && (
            <button onClick={() => { setErrorMsg(""); setIsReabrirModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 border border-primary/30 rounded-md font-medium text-xs hover:bg-primary/5 bg-card text-primary">
              <Unlock className="w-3.5 h-3.5" /> Reabrir Campanha
            </button>
          )}
        </div>
      </div>

      {campanha.status === 'finalizada' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 text-sm">
          <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Esta campanha está <strong>finalizada</strong> — nenhum item, transação ou documento novo pode ser adicionado, editado ou excluído. Reabra a campanha (admin + senha) para voltar a movimentá-la.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Itens completos</p>
          <h2 className="text-xl font-bold">{itensCompletos} <span className="text-sm font-normal text-muted-foreground">de {totalItens}</span></h2>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-2">
            <div className={`h-full ${campanha.cor} rounded-full`} style={{ width: `${totalItens > 0 ? Math.min(100, (itensCompletos / totalItens) * 100) : 0}%` }}></div>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Saldo financeiro</p>
          <h2 className="text-xl font-bold">{formatBRLWithSymbol(campanha.saldo_financeiro ?? 0)}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            +{formatBRLWithSymbol(campanha.valor_arrecadado ?? 0)} / -{formatBRLWithSymbol(campanha.valor_gasto ?? 0)}
          </p>
        </div>
        <div className="bg-card p-5 rounded-2xl border shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Meta financeira</p>
          <h2 className="text-xl font-bold">{campanha.meta_financeira ? formatBRLWithSymbol(campanha.meta_financeira) : "—"}</h2>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Itens da campanha</h3>
          {campanhaAtiva && podeCriarFinanceiro && (
            <button onClick={() => { setErrorMsg(""); setIsTxModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 border rounded-md font-medium text-xs hover:bg-muted/50 bg-card text-foreground">
              <DollarSign className="w-3.5 h-3.5" /> Lançar Transação Financeira
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itens.map((item) => {
            const atual = item.quantidade_atual ?? 0;
            const meta = item.meta_quantidade ?? 0;
            const progresso = item.progresso_percentual_bruto ?? 0;
            const precoRef = precos.find((p) => p.item_nome.toLowerCase() === (item.nome ?? '').toLowerCase());
            const valorEstimado = precoRef ? precoRef.preco_unitario * atual : null;
            const completo = meta > 0 && atual >= meta;
            return (
              <div key={item.id} className="bg-card p-4 rounded-2xl border shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{item.nome}</h4>
                    <span className="text-[10px] font-medium text-muted-foreground">{item.categoria}</span>
                  </div>
                  {completo && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
                <p className="text-sm">
                  <span className="font-bold">{atual}</span>
                  <span className="text-muted-foreground"> / {meta} {item.unidade}</span>
                </p>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2 mb-1">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, progresso)}%` }}></div>
                </div>
                <p className="text-[11px] text-muted-foreground">{progresso}%{progresso > 100 ? " (meta superada)" : ""}</p>
                {valorEstimado !== null && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1"><Tag className="w-3 h-3" /> Estimado: {formatBRLWithSymbol(valorEstimado)}</p>
                )}
                {campanhaAtiva && podeEditarDoacoes && (
                  <button onClick={() => { setErrorMsg(""); setItemAlvo(item); }} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md font-medium text-xs hover:bg-primary/90">
                    <Package className="w-3.5 h-3.5" /> Lançar Item Recebido
                  </button>
                )}
              </div>
            );
          })}
          {itens.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhum item cadastrado nesta campanha.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-sm">Lançamentos de item</h3></div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {lancamentos.length === 0 && <p className="p-4 text-xs text-muted-foreground">Nenhum lançamento ainda.</p>}
            {lancamentos.map((l) => (
              <div key={l.id} className="p-3 px-4 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">{l.quantidade} {l.campanha_itens?.unidade} · {l.campanha_itens?.nome}</p>
                  <p className="text-xs text-muted-foreground">{l.doadores?.nome || "Não identificado"} · {formatDateBR(l.data)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-sm">Transações vinculadas</h3></div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {transacoes.length === 0 && <p className="p-4 text-xs text-muted-foreground">Nenhuma transação vinculada.</p>}
            {transacoes.map((t) => (
              <div key={t.id} className="p-3 px-4 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">{t.descricao}</p>
                  <p className="text-xs text-muted-foreground">{formatDateBR(t.data)}</p>
                </div>
                <span className={`font-semibold ${t.tipo === 'entrada' ? 'text-primary' : 'text-red-500'}`}>
                  {t.tipo === 'entrada' ? '+' : '-'} {formatBRLWithSymbol(t.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Documentos da campanha</h3>
          {campanhaAtiva && (
            <button onClick={() => { setErrorMsg(""); setIsDocModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md font-medium text-xs hover:bg-muted/50 bg-card text-foreground">
              <UploadCloud className="w-3.5 h-3.5" /> Anexar Documento
            </button>
          )}
        </div>
        <div className="divide-y">
          {documentos.length === 0 && <p className="p-4 text-xs text-muted-foreground">Nenhum documento anexado a esta campanha.</p>}
          {documentos.map((doc) => (
            <div key={doc.id} className="p-3 px-4 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.nome_original}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleAbrirDocumento(doc.storage_path)} className="p-1.5 border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Visualizar">
                  <Eye className="w-4 h-4" />
                </button>
                {campanhaAtiva && podeEditarDoacoes && (
                  <button onClick={() => setIsDeletingDocId(doc.id)} className="p-1.5 border border-red-100 dark:border-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md text-red-500" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {itemAlvo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-lg text-foreground">
            <h2 className="text-lg font-bold mb-4">Lançar "{itemAlvo.nome}" Recebido</h2>
            <form onSubmit={handleLancarItem} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantidade ({itemAlvo.unidade})</label>
                <input type="number" required step="0.01" value={itemQuantidade} onChange={(e) => setItemQuantidade(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Observação (opcional)</label>
                <input type="text" value={itemObs} onChange={(e) => setItemObs(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setItemAlvo(null)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted/50 bg-card text-foreground">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-60">{saving ? "Salvando..." : "Lançar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-lg text-foreground">
            <h2 className="text-lg font-bold mb-4">Nova Transação da Campanha</h2>
            <form onSubmit={handleLancarTransacao} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <input type="text" required value={txDescricao} onChange={(e) => setTxDescricao(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select value={txTipo} onChange={(e) => setTxTipo(e.target.value as 'entrada' | 'saida')}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Valor</label>
                <input type="text" required value={txValor} onChange={(e) => setTxValor(formatCurrencyInputMask(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsTxModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted/50 bg-card text-foreground">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-60">{saving ? "Salvando..." : "Lançar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border shadow-xl relative text-foreground flex flex-col max-h-[90vh] overflow-y-auto">
            <button onClick={() => { if (!saving) setIsDocModalOpen(false); }} disabled={saving} className="absolute top-4 right-4 p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold mb-1">Anexar Documento à Campanha</h2>
            <p className="text-xs text-muted-foreground mb-5">Apenas PDF ou Word (.doc, .docx).</p>
            <form onSubmit={handleEnviarDocumento} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivo</label>
                <div className="relative border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-muted/10 group">
                  <input type="file" required accept=".pdf,.doc,.docx" disabled={saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDocArquivo(file);
                      if (!docNome) setDocNome(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><UploadCloud className="w-6 h-6" /></div>
                    {docArquivo ? (
                      <p className="text-sm font-semibold text-foreground line-clamp-1 px-4">{docArquivo.name}</p>
                    ) : (
                      <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Documento</label>
                <input type="text" required value={docNome} onChange={(e) => setDocNome(e.target.value)} disabled={saving}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição (opcional)</label>
                <textarea rows={2} value={docDescricao} onChange={(e) => setDocDescricao(e.target.value)} disabled={saving}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button type="button" onClick={() => setIsDocModalOpen(false)} disabled={saving} className="px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted text-foreground bg-card disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-70">{saving ? "Enviando..." : "Salvar Documento"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeletingDocId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-xl text-center relative text-foreground">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground">Excluir Documento?</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">Esta ação é permanente e removerá o arquivo do armazenamento.</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setIsDeletingDocId(null)} className="px-4 py-2 border rounded-xl font-medium text-xs text-muted-foreground hover:bg-muted bg-card">Voltar</button>
              <button onClick={() => { const doc = documentos.find((d) => d.id === isDeletingDocId); if (doc) handleExcluirDocumento(doc); }} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs shadow-sm">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isFinalizarModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-xl text-center relative text-foreground">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground">Finalizar Campanha?</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
              Depois de finalizada, não será possível inserir, editar ou excluir itens, transações ou documentos desta campanha. Reabrir exige senha de um administrador.
            </p>
            {errorMsg && <p className="text-xs text-red-500 mt-3">{errorMsg}</p>}
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setIsFinalizarModalOpen(false)} disabled={saving} className="px-4 py-2 border rounded-xl font-medium text-xs text-muted-foreground hover:bg-muted bg-card disabled:opacity-50">Cancelar</button>
              <button onClick={handleFinalizar} disabled={saving} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm disabled:opacity-70">{saving ? "Finalizando..." : "Sim, Finalizar"}</button>
            </div>
          </div>
        </div>
      )}

      {isReabrirModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-xl relative text-foreground">
            <h3 className="font-bold text-lg mb-1">Reabrir Campanha</h3>
            <p className="text-xs text-muted-foreground mb-4">Confirme sua senha de acesso {user?.email && <span>(<strong>{user.email}</strong>)</span>} para reabrir esta campanha.</p>
            <form onSubmit={handleReabrir} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sua senha</label>
                <input type="password" required autoComplete="new-password" value={reabrirSenha} onChange={(e) => setReabrirSenha(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <input type="text" value={reabrirMotivo} onChange={(e) => setReabrirMotivo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsReabrirModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted/50 bg-card text-foreground">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-60">{saving ? "Reabrindo..." : "Reabrir"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
