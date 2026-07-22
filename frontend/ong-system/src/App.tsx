import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Heart, DollarSign, Users, Settings, LogOut, ShieldAlert, Crown, Shield, Menu, X, FileText, Tag } from "lucide-react";
import { useState } from "react";
import Overview from "./pages/Overview";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Financial from "./pages/Financial";
import Volunteers from "./pages/Volunteers";
import Documents from "./pages/Documents";
import PricingReference from "./pages/PricingReference";
import TeamPage from "./pages/Team";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import { CARGO_COLORS, CARGO_LABELS } from "./lib/supabase";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  modulo: 'visao_geral' | 'doacoes' | 'financeiro' | 'voluntarios' | 'configuracoes';
}

const ALL_NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Visão Geral', icon: LayoutDashboard, modulo: 'visao_geral' },
  { path: '/campanhas', label: 'Campanhas', icon: Heart, modulo: 'doacoes' },
  { path: '/financeiro', label: 'Financeiro', icon: DollarSign, modulo: 'financeiro' },
  { path: '/voluntarios', label: 'Voluntários', icon: Users, modulo: 'voluntarios' },
  { path: '/documentos', label: 'Documentos', icon: FileText, modulo: 'visao_geral' },
  { path: '/precos-referencia', label: 'Preços de Referência', icon: Tag, modulo: 'doacoes' },
  { path: '/equipe', label: 'Equipe', icon: ShieldAlert, modulo: 'configuracoes' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, modulo: 'configuracoes' },
];

function AppInner() {
  const { session, perfil, loading, signOut, podeFazer, isAdmin, isAdminMaster } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  if (!session) {
    return <Login />;
  }

  const itensVisiveis = ALL_NAV_ITEMS.filter((item) => {
    if (isAdmin || isAdminMaster) return true;
    return podeFazer(item.modulo, 'ver');
  });

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background overflow-hidden font-sans">
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

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 flex flex-col border-r bg-card h-full z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
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
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {itensVisiveis.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

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

      <main className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] dark:bg-background">
        <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/campanhas" element={<Campaigns />} />
            <Route path="/campanhas/:id" element={<CampaignDetail />} />
            <Route path="/financeiro" element={<Financial />} />
            <Route path="/voluntarios" element={<Volunteers />} />
            <Route path="/documentos" element={<Documents />} />
            <Route path="/precos-referencia" element={<PricingReference />} />
            <Route path="/equipe" element={<TeamPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
