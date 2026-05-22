import { useState, useEffect } from "react";
import { LayoutDashboard, Heart, DollarSign, Users, Settings, LogOut, ShieldAlert, Crown, Shield, Menu, X, FileText } from "lucide-react";
import Overview from "./pages/Overview";
import Donations from "./pages/Donations";
import Financial from "./pages/Financial";
import Volunteers from "./pages/Volunteers";
import Documents from "./pages/Documents";
import TeamPage from "./pages/Team";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import { CARGO_COLORS, CARGO_LABELS } from "./lib/supabase";
import BackendStatusGate from "./components/BackendStatusGate";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  modulo: 'visao_geral' | 'doacoes' | 'financeiro' | 'voluntarios' | 'configuracoes';
}

const ALL_TABS: Tab[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, modulo: 'visao_geral' },
  { id: 'donations', label: 'Doações', icon: Heart, modulo: 'doacoes' },
  { id: 'financial', label: 'Financeiro', icon: DollarSign, modulo: 'financeiro' },
  { id: 'volunteers', label: 'Voluntários', icon: Users, modulo: 'voluntarios' },
  { id: 'documents', label: 'Documentos', icon: FileText, modulo: 'visao_geral' },
  { id: 'team', label: 'Equipe', icon: ShieldAlert, modulo: 'configuracoes' },
  { id: 'settings', label: 'Configurações', icon: Settings, modulo: 'configuracoes' },
];

function AppInner() {
  const { session, perfil, loading, signOut, podeFazer, isAdmin, isAdminMaster } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Efeito para carregar e gerenciar o tema escuro/claro
  useEffect(() => {
    const aplicarTema = () => {
      const temaSalvo = localStorage.getItem('theme') || 'light';
      if (
        temaSalvo === 'dark' ||
        (temaSalvo === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    aplicarTema();

    window.addEventListener('theme-change', aplicarTema);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (localStorage.getItem('theme') === 'system') {
        aplicarTema();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('theme-change', aplicarTema);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  // Aguarda carregamento inicial
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
        </div>
      </div>
    );
  }

  // Não autenticado → tela de login
  if (!session) {
    return <Login />;
  }

  // Abas visíveis conforme permissão
  const tabsVisiveis = ALL_TABS.filter((tab) => {
    if (isAdmin || isAdminMaster) return true;
    return podeFazer(tab.modulo, 'ver');
  });

  // Garante que a aba ativa está disponível
  const tabAtiva = tabsVisiveis.find((t) => t.id === activeTab)
    ? activeTab
    : tabsVisiveis[0]?.id ?? 'overview';

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background overflow-hidden font-sans">
      {/* Header Móvel */}
      <header className="flex md:hidden items-center justify-between px-5 py-4 border-b bg-card w-full flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold text-sm leading-none block">
              Ação Entre Amigos
            </span>
            <span className="text-[9px] text-muted-foreground">Sistema ONG</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-xl border bg-muted/30 hover:bg-muted text-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop para mobile com transição suave */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixa no desktop, gaveta deslizante no mobile */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 flex flex-col border-r bg-card h-full z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b flex-shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <Heart className="w-4.5 h-4.5 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-sm leading-tight block">
                Ação Entre Amigos
              </span>
              <span className="text-[10px] text-muted-foreground">Sistema ONG</span>
            </div>
          </div>
          {/* Botão de Fechar para Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabsVisiveis.map((tab) => {
            const Icon = tab.icon;
            const isActive = tabAtiva === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary' : ''}`} />
                {tab.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Perfil do usuário logado */}
        {perfil && (
          <div className="p-3 border-t space-y-2 flex-shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {perfil.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{perfil.nome}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {perfil.cargo === 'admin_master' && (
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />
                  )}
                  {(perfil.cargo === 'admin' || perfil.cargo === 'admin_master') && perfil.cargo !== 'admin_master' && (
                    <Shield className="w-3 h-3 text-blue-500" />
                  )}
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CARGO_COLORS[perfil.cargo]}`}
                  >
                    {CARGO_LABELS[perfil.cargo]}
                  </span>
                </div>
              </div>
            </div>

            <button
              id="btn-sair"
              onClick={() => signOut()}
              className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] dark:bg-background">
        <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          {tabAtiva === 'overview' && <Overview setActiveTab={setActiveTab} />}
          {tabAtiva === 'donations' && <Donations />}
          {tabAtiva === 'financial' && <Financial />}
          {tabAtiva === 'volunteers' && <Volunteers />}
          {tabAtiva === 'documents' && <Documents />}
          {tabAtiva === 'team' && <TeamPage />}
          {tabAtiva === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BackendStatusGate>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BackendStatusGate>
  );
}


