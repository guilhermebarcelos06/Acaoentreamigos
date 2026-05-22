import { useState, useEffect } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  Crown,
  Check,
  Loader2,
  AlertTriangle,
  Search,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, CargoUsuario, ModuloSistema, Perfil, PermissaoPerfil, CARGO_LABELS, CARGO_COLORS, MODULO_LABELS } from '../lib/supabase';

interface UsuarioCompleto extends Perfil {
  email: string;
  permissoes: PermissaoPerfil[];
}

const CARGOS_DISPONIVEIS: { value: CargoUsuario; label: string; desc: string }[] = [
  { value: 'admin_master', label: 'Admin Master', desc: 'Controle total, único que gerencia outros administradores' },
  { value: 'admin', label: 'Administrador', desc: 'Gerencia usuários e conteúdos dos módulos' },
  { value: 'financeiro', label: 'Financeiro', desc: 'Acesso completo às movimentações financeiras' },
  { value: 'editor', label: 'Editor', desc: 'Pode gerenciar doações e campanhas' },
  { value: 'visualizador', label: 'Visualizador', desc: 'Apenas visualiza informações (leitura)' },
];

const MODULOS: ModuloSistema[] = ['visao_geral', 'doacoes', 'financeiro', 'voluntarios', 'configuracoes'];

type PermMap = Record<ModuloSistema, { ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>;

function permMapVazio(): PermMap {
  return Object.fromEntries(
    MODULOS.map((m) => [m, { ver: false, criar: false, editar: false, excluir: false }])
  ) as PermMap;
}

function permMapPorCargo(cargo: CargoUsuario): PermMap {
  const map = permMapVazio();
  for (const m of MODULOS) {
    const isAdmin = cargo === 'admin_master' || cargo === 'admin';
    const isFinanceiro = cargo === 'financeiro';
    const isEditor = cargo === 'editor';
    const isVisualizador = cargo === 'visualizador';

    map[m].ver =
      isAdmin ||
      (isFinanceiro && (m === 'visao_geral' || m === 'financeiro')) ||
      (isEditor && (m === 'visao_geral' || m === 'doacoes' || m === 'voluntarios')) ||
      (isVisualizador && (m === 'visao_geral' || m === 'doacoes'));

    map[m].criar =
      isAdmin ||
      (isFinanceiro && m === 'financeiro') ||
      (isEditor && m === 'doacoes');

    map[m].editar =
      isAdmin ||
      (isFinanceiro && m === 'financeiro') ||
      (isEditor && (m === 'doacoes' || m === 'voluntarios'));

    map[m].excluir = isAdmin;
  }
  return map;
}

interface NovoUsuarioForm {
  nome: string;
  email: string;
  senha: string;
  cargo: CargoUsuario;
  permissoes: PermMap;
}

export default function Team() {
  const { perfil: meuPerfil, isAdminMaster, isAdmin } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState<'novo' | 'editar' | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCompleto | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [form, setForm] = useState<NovoUsuarioForm>({
    nome: '',
    email: '',
    senha: '',
    cargo: 'editor',
    permissoes: permMapPorCargo('editor'),
  });

  async function carregarUsuarios() {
    setLoading(true);
    try {
      const { data: perfisData, error } = await supabase
        .from('perfis')
        .select('*')
        .order('criado_em', { ascending: true });

      if (error) throw error;

      const { data: permsData } = await supabase
        .from('permissoes_perfil')
        .select('*');

      // Em produção real com supabase RLS/Auth, o email vem do auth.users se buscado via Admin,
      // ou podemos salvar opcionalmente um campo espelho. Adicionamos fallback amigável.
      const perfisComEmail: UsuarioCompleto[] = perfisData.map((p: Perfil) => {
        const perms = permsData?.filter((perm: PermissaoPerfil) => perm.perfil_id === p.id) || [];
        return { ...p, email: (p as any).email || `${p.nome.toLowerCase().replace(/\s+/g, '')}@acaoentreamigos.org`, permissoes: perms };
      });

      setUsuarios(perfisComEmail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  function handleCargoChange(cargo: CargoUsuario) {
    setForm((f) => ({ ...f, cargo, permissoes: permMapPorCargo(cargo) }));
  }

  function togglePerm(
    modulo: ModuloSistema,
    acao: 'ver' | 'criar' | 'editar' | 'excluir',
  ) {
    setForm((f) => {
      const novo = { ...f.permissoes };
      novo[modulo] = { ...novo[modulo], [acao]: !novo[modulo][acao] };
      
      if (acao === 'ver' && novo[modulo].ver === false) {
        novo[modulo] = { ver: false, criar: false, editar: false, excluir: false };
      }
      
      if (acao !== 'ver' && novo[modulo][acao]) {
        novo[modulo].ver = true;
      }
      return { ...f, permissoes: novo };
    });
  }

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);

    try {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: { nome: form.nome, cargo: form.cargo },
        },
      });

      if (signupError) throw signupError;
      
      const newId = signupData.user?.id;
      if (newId) {
        // Atualizar perfil criado pelo trigger com o nome correto
        await supabase
          .from('perfis')
          .update({ nome: form.nome, cargo: form.cargo })
          .eq('id', newId);

        // Atualizar permissões
        await supabase.from('permissoes_perfil').delete().eq('perfil_id', newId);

        const inserts = MODULOS.map((m) => ({
          perfil_id: newId,
          modulo: m,
          pode_ver: form.permissoes[m].ver,
          pode_criar: form.permissoes[m].criar,
          pode_editar: form.permissoes[m].editar,
          pode_excluir: form.permissoes[m].excluir,
        }));

        await supabase.from('permissoes_perfil').insert(inserts);
      }

      setMensagem({ tipo: 'ok', texto: 'Usuário cadastrado com sucesso! Uma confirmação foi enviada ao e-mail.' });
      setModalAberto(null);
      resetForm();
      await carregarUsuarios();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao criar usuário.' });
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicao(usuario: UsuarioCompleto) {
    setUsuarioEditando(usuario);
    const permMap = permMapVazio();
    usuario.permissoes.forEach((p) => {
      permMap[p.modulo] = {
        ver: p.pode_ver,
        criar: p.pode_criar,
        editar: p.pode_editar,
        excluir: p.pode_excluir,
      };
    });
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      cargo: usuario.cargo,
      permissoes: permMap,
    });
    setModalAberto('editar');
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioEditando) return;
    setSalvando(true);
    setMensagem(null);

    try {
      if (usuarioEditando.cargo === 'admin_master' && !isAdminMaster) {
        throw new Error('Apenas o Admin Master pode alterar seu próprio cadastro.');
      }
      if ((form.cargo === 'admin_master' || form.cargo === 'admin') && !isAdminMaster) {
        throw new Error('Apenas o Admin Master pode promover membros a Administrador.');
      }

      await supabase
        .from('perfis')
        .update({ nome: form.nome, cargo: form.cargo })
        .eq('id', usuarioEditando.id);

      await supabase
        .from('permissoes_perfil')
        .delete()
        .eq('perfil_id', usuarioEditando.id);

      const inserts = MODULOS.map((m) => ({
        perfil_id: usuarioEditando.id,
        modulo: m,
        pode_ver: form.permissoes[m].ver,
        pode_criar: form.permissoes[m].criar,
        pode_editar: form.permissoes[m].editar,
        pode_excluir: form.permissoes[m].excluir,
      }));

      await supabase.from('permissoes_perfil').insert(inserts);

      setMensagem({ tipo: 'ok', texto: 'Usuário atualizado com sucesso!' });
      setModalAberto(null);
      setUsuarioEditando(null);
      await carregarUsuarios();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao salvar.' });
    } finally {
      setSalvando(false);
    }
  }

  async function deletarUsuario(usuario: UsuarioCompleto) {
    if (usuario.cargo === 'admin_master') {
      setMensagem({ tipo: 'erro', texto: 'Não é possível remover o Admin Master do sistema.' });
      return;
    }
    if (!confirm(`Remover "${usuario.nome}" da equipe? Esta pessoa perderá o acesso imediatamente.`)) return;

    try {
      const { error } = await supabase.from('perfis').delete().eq('id', usuario.id);
      if (error) throw error;
      setMensagem({ tipo: 'ok', texto: 'Usuário removido com sucesso.' });
      await carregarUsuarios();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao remover usuário.' });
    }
  }

  function resetForm() {
    setForm({
      nome: '',
      email: '',
      senha: '',
      cargo: 'editor',
      permissoes: permMapPorCargo('editor'),
    });
  }

  function fecharModal() {
    setModalAberto(null);
    setUsuarioEditando(null);
    resetForm();
    setMensagem(null);
  }

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      CARGO_LABELS[u.cargo].toLowerCase().includes(busca.toLowerCase())
  );

  const podeGerenciar = isAdmin || isAdminMaster;

  return (
    <div className="space-y-6">
      {/* Topo da Tela */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle quem acessa o painel do sistema e defina permissões granulares por cargos e módulos.
          </p>
        </div>
        {podeGerenciar && (
          <button
            id="btn-novo-membro"
            onClick={() => {
              resetForm();
              setModalAberto('novo');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Membro
          </button>
        )}
      </div>

      {/* Alertas */}
      {mensagem && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            mensagem.tipo === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {mensagem.tipo === 'ok' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">{mensagem.texto}</span>
          <button onClick={() => setMensagem(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      )}

      {/* Quadro Informativo do Meu Acesso */}
      {meuPerfil && (
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm flex-shrink-0">
            {meuPerfil.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{meuPerfil.nome}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${CARGO_COLORS[meuPerfil.cargo]}`}>
                {CARGO_LABELS[meuPerfil.cargo]}
              </span>
              <span className="text-[11px] text-muted-foreground">Seu nível de acesso atual</span>
            </div>
          </div>
          {isAdminMaster && (
            <div className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-medium">
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
              Modo Admin Master
            </div>
          )}
        </div>
      )}

      {/* Caixa de Pesquisa e Lista */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">Membros da Equipe</h3>
              <p className="text-xs text-muted-foreground">
                {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} ativo{usuarios.length !== 1 ? 's' : ''} no painel.
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou cargo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nenhum membro da equipe encontrado para a busca.
          </div>
        ) : (
          <div className="divide-y">
            {usuariosFiltrados.map((usuario) => {
              const isMe = usuario.id === meuPerfil?.id;
              const isAM = usuario.cargo === 'admin_master';
              
              // Regras de Edição / Deleção baseado em hierarquia
              const podeEditar = podeGerenciar && !isMe && (isAdminMaster || (!isAM && usuario.cargo !== 'admin'));
              const podeDeletar = isAdminMaster && !isMe && !isAM;

              return (
                <div
                  key={usuario.id}
                  className="p-4 px-6 flex items-center justify-between hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-secondary font-bold flex items-center justify-center text-sm border">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </div>
                      {isAM && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border border-card shadow-sm">
                          <Crown className="w-3.5 h-3.5 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">{usuario.nome}</h4>
                        {isMe && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs">
                        <span className="text-muted-foreground">{usuario.email}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${CARGO_COLORS[usuario.cargo]}`}>
                          {CARGO_LABELS[usuario.cargo]}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-[11px]">
                          {usuario.permissoes.filter((p) => p.pode_ver).length} de {MODULOS.length} módulos visíveis
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {podeEditar && (
                      <button
                        onClick={() => abrirEdicao(usuario)}
                        className="p-2 border rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all bg-card"
                        title="Editar permissões"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {podeDeletar && (
                      <button
                        onClick={() => deletarUsuario(usuario)}
                        className="p-2 border rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all bg-card"
                        title="Remover da equipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR / EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="bg-card w-full max-w-2xl rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header do Modal */}
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {modalAberto === 'novo' ? (
                  <>
                    <UserPlus className="w-5 h-5 text-primary" />
                    Novo Membro da Equipe
                  </>
                ) : (
                  <>
                    <Pencil className="w-5 h-5 text-primary" />
                    Editar Permissões do Membro
                  </>
                )}
              </h2>
              <button
                onClick={fecharModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Modal (Scrollable) */}
            <form
              onSubmit={modalAberto === 'novo' ? criarUsuario : salvarEdicao}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    E-mail de Login
                  </label>
                  <input
                    type="email"
                    required
                    disabled={modalAberto === 'editar'}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="exemplo@ong.org"
                  />
                </div>
              </div>

              {/* Senha Temporária (Apenas Criação) */}
              {modalAberto === 'novo' && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    Senha Temporária de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Mínimo de 6 caracteres"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Defina uma senha inicial. O usuário poderá alterá-la futuramente após o primeiro acesso.
                  </p>
                </div>
              )}

              {/* Seleção de Níveis / Cargos */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Cargo &amp; Nível Padrão
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CARGOS_DISPONIVEIS.map((c) => {
                    const bloqueado = (c.value === 'admin_master' || c.value === 'admin') && !isAdminMaster;
                    const selecionado = form.cargo === c.value;

                    return (
                      <button
                        key={c.value}
                        type="button"
                        disabled={bloqueado}
                        onClick={() => !bloqueado && handleCargoChange(c.value)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          selecionado
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : bloqueado
                            ? 'opacity-40 cursor-not-allowed border-dashed bg-muted/20'
                            : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                            selecionado ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}
                        >
                          {selecionado && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">{c.label}</span>
                            {c.value === 'admin_master' && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                            {c.desc}
                            {bloqueado && ' (Apenas Admin Master)'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de Checkboxes de Permissões Granulares */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Permissões Granulares por Módulo
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Você pode ligar ou desligar ações específicas para cada página do painel.
                    </p>
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  {/* Cabeçalho */}
                  <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-muted/40 border-b text-center text-xs font-bold text-muted-foreground">
                    <div className="text-left font-semibold">Módulo do Sistema</div>
                    <div>Ver</div>
                    <div>Criar</div>
                    <div>Editar</div>
                    <div>Excluir</div>
                  </div>

                  {/* Linhas */}
                  {MODULOS.map((m) => (
                    <div
                      key={m}
                      className="grid grid-cols-5 gap-2 px-4 py-3.5 border-b last:border-0 hover:bg-muted/10 transition-colors items-center text-center"
                    >
                      <div className="text-left">
                        <span className="text-sm font-semibold text-foreground">{MODULO_LABELS[m]}</span>
                      </div>
                      {(['ver', 'criar', 'editar', 'excluir'] as const).map((acao) => {
                        const ativo = form.permissoes[m][acao];
                        return (
                          <div key={acao} className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => togglePerm(m, acao)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                ativo
                                  ? 'bg-primary border-primary text-white shadow-sm'
                                  : 'border-muted-foreground/30 hover:border-primary/50 bg-background'
                              }`}
                            >
                              {ativo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-60 shadow-sm hover:shadow-md"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : modalAberto === 'novo' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Cadastrar Membro
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
