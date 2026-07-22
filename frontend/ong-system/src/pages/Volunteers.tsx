import { useState, useEffect } from "react";
import { Search, ExternalLink, Link2, Users, CalendarDays, Mail, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  listarVoluntarios,
  criarVoluntario,
  atualizarVoluntario,
  excluirVoluntario,
  type Voluntario,
} from "../lib/services/voluntarios";
import { lerConfiguracao, salvarConfiguracao } from "../lib/services/configuracoes";
import { formatDateBR } from "../lib/dates";

export default function Volunteers() {
  const { user, podeFazer, isAdmin, isAdminMaster } = useAuth();
  const [volunteerList, setVolunteerList] = useState<Voluntario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formUrl, setFormUrl] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormUrlModalOpen, setIsFormUrlModalOpen] = useState(false);
  const [formUrlInput, setFormUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const podeGerenciar = isAdmin || isAdminMaster || podeFazer('voluntarios', 'criar');
  const podeExcluir = isAdmin || isAdminMaster || podeFazer('voluntarios', 'excluir');

  const [novo, setNovo] = useState({ nome: "", email: "", telefone: "", habilidades: "" });

  const carregar = () => {
    setLoading(true);
    Promise.all([listarVoluntarios(), lerConfiguracao<string | null>('voluntarios_form_url')])
      .then(([v, url]) => {
        setVolunteerList(v);
        setFormUrl(url);
      })
      .catch((err) => console.error("Erro ao carregar voluntários:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const filteredVolunteers = volunteerList.filter((v) =>
    (v.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.habilidades || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hoje = new Date();
  const ativos = volunteerList.filter((v) => v.status === 'ativo').length;
  const novosEsteMes = volunteerList.filter((v) => {
    const d = new Date(v.data_inscricao + 'T00:00:00');
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  }).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      await criarVoluntario({ ...novo, status: 'novo' });
      setIsModalOpen(false);
      setNovo({ nome: "", email: "", telefone: "", habilidades: "" });
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao cadastrar voluntário.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await atualizarVoluntario(id, { status: status as Voluntario['status'] });
      carregar();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Remover este voluntário?")) return;
    try {
      await excluirVoluntario(id);
      carregar();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalvarFormUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await salvarConfiguracao('voluntarios_form_url', formUrlInput || null, user.id);
      setFormUrl(formUrlInput || null);
      setIsFormUrlModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Voluntários</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e acompanhamento de voluntários da ONG.</p>

          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Users className="w-4 h-4" /> {ativos} Ativos
            </div>
            <div className="flex items-center gap-2 text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">
              <CalendarDays className="w-4 h-4" /> {novosEsteMes} Novos este mês
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {formUrl ? (
            <a href={formUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground">
              <ExternalLink className="w-4 h-4" /> Ver Formulário
            </a>
          ) : (isAdmin || isAdminMaster) ? (
            <button onClick={() => { setFormUrlInput(""); setIsFormUrlModalOpen(true); }}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground">
              <Link2 className="w-4 h-4" /> Vincular Formulário
            </button>
          ) : null}
          {(isAdmin || isAdminMaster) && formUrl && (
            <button onClick={() => { setFormUrlInput(formUrl); setIsFormUrlModalOpen(true); }}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground">
              <Link2 className="w-4 h-4" /> Editar Link
            </button>
          )}
          {podeGerenciar && (
            <button onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Novo Voluntário
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col mt-8">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar voluntário por nome ou habilidade.." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-medium">NOME & CONTATO</th>
                <th className="px-6 py-4 font-medium">HABILIDADES / INTERESSE</th>
                <th className="px-6 py-4 font-medium">STATUS</th>
                <th className="px-6 py-4 font-medium">DATA DE INSCRIÇÃO</th>
                {podeExcluir && <th className="px-6 py-4 font-medium text-right">AÇÕES</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">Carregando...</td></tr>}
              {!loading && filteredVolunteers.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{v.nome}</p>
                    {v.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Mail className="w-3 h-3" /> {v.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{v.habilidades}</td>
                  <td className="px-6 py-4">
                    {podeGerenciar ? (
                      <select value={v.status} onChange={(e) => handleStatusChange(v.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border-0
                          ${v.status === 'ativo' ? 'bg-primary/10 text-primary' :
                            v.status === 'inativo' ? 'bg-secondary text-muted-foreground' :
                            'bg-amber-100 text-amber-700'}`}>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="novo">Novo (Avaliação)</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded text-xs font-medium
                        ${v.status === 'ativo' ? 'bg-primary/10 text-primary' :
                          v.status === 'inativo' ? 'bg-secondary text-muted-foreground' :
                          'bg-amber-100 text-amber-700'}`}>
                        {v.status === 'ativo' ? 'Ativo' : v.status === 'inativo' ? 'Inativo' : 'Novo (Avaliação)'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDateBR(v.data_inscricao)}</td>
                  {podeExcluir && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleExcluir(v.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filteredVolunteers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">Nenhum voluntário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-lg relative text-foreground">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold mb-4">Novo Voluntário</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input type="text" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <input type="text" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Habilidades</label>
                <input type="text" value={novo.habilidades} onChange={(e) => setNovo({ ...novo, habilidades: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cozinha, Marketing" />
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

      {isFormUrlModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-lg relative text-foreground">
            <button onClick={() => setIsFormUrlModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold mb-4">Link do Formulário de Inscrição</h2>
            <form onSubmit={handleSalvarFormUrl} className="space-y-4">
              <input type="url" required value={formUrlInput} onChange={(e) => setFormUrlInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="https://forms.gle/..." />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsFormUrlModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted/50 bg-card text-foreground">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
