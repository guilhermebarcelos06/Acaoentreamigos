import { useState, useEffect } from "react";
import { Plus, Tag, AlertTriangle, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  listarPrecosReferencia,
  criarOuAtualizarPrecoReferencia,
  excluirPrecoReferencia,
  precoEstaDesatualizado,
  type PrecoReferencia,
} from "../lib/services/precosReferencia";
import { formatBRLWithSymbol } from "../lib/currency";

const CATEGORIAS = ["ALIMENTOS", "VESTUÁRIO", "INFANTIL", "HIGIENE", "OUTRO"];

export default function PricingReference() {
  const { user, isAdmin, isAdminMaster } = useAuth();
  const [precos, setPrecos] = useState<PrecoReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const podeGerenciar = isAdmin || isAdminMaster;

  const [form, setForm] = useState({ item_nome: "", categoria: "ALIMENTOS", unidade: "unidades", preco_unitario: "" });

  const carregar = () => {
    setLoading(true);
    listarPrecosReferencia().then(setPrecos).catch((err) => console.error(err)).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      await criarOuAtualizarPrecoReferencia({
        item_nome: form.item_nome,
        categoria: form.categoria,
        unidade: form.unidade,
        preco_unitario: parseFloat(form.preco_unitario.replace(',', '.')) || 0,
        atualizado_por: user?.id,
        atualizado_em: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setForm({ item_nome: "", categoria: "ALIMENTOS", unidade: "unidades", preco_unitario: "" });
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar preço de referência.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este preço de referência?")) return;
    try {
      await excluirPrecoReferencia(id);
      carregar();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-sans text-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preços de Referência</h1>
          <p className="text-sm text-muted-foreground">
            Usado para estimar o valor de itens doados em espécie por campanha. Não existe API pública confiável de
            preços no Brasil — mantido manualmente.
          </p>
        </div>
        {podeGerenciar && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Novo Preço
          </button>
        )}
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                <th className="px-6 py-4 font-medium">Preço Unitário</th>
                <th className="px-6 py-4 font-medium">Atualizado em</th>
                {podeGerenciar && <th className="px-6 py-4 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {precos.map((p) => {
                const desatualizado = precoEstaDesatualizado(p.atualizado_em);
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" /> {p.item_nome}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{p.categoria}</td>
                    <td className="px-6 py-4">{formatBRLWithSymbol(p.preco_unitario)} / {p.unidade}</td>
                    <td className="px-6 py-4">
                      <span className={desatualizado ? "text-amber-600 font-medium flex items-center gap-1" : "text-muted-foreground"}>
                        {desatualizado && <AlertTriangle className="w-3.5 h-3.5" />}
                        {new Date(p.atualizado_em).toLocaleDateString('pt-BR')}
                        {desatualizado && " (desatualizado)"}
                      </span>
                    </td>
                    {podeGerenciar && (
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleExcluir(p.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {precos.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">Nenhum preço de referência cadastrado.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-lg relative text-foreground">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Novo Preço de Referência</h2>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do item</label>
                <input type="text" required value={form.item_nome} onChange={(e) => setForm({ ...form, item_nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cesta Básica" />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Unidade</label>
                  <input type="text" required value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="kg, unidades" />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço (R$)</label>
                  <input type="text" required value={form.preco_unitario} onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: 6,50" />
                </div>
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted/50 bg-card text-foreground">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
