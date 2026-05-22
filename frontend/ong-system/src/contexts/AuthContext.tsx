import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  Perfil,
  MapaPermissoes,
  CargoUsuario,
} from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  permissoes: MapaPermissoes;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
  podeFazer: (modulo: keyof MapaPermissoes, acao: 'ver' | 'criar' | 'editar' | 'excluir') => boolean;
  isAdminMaster: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [permissoes, setPermissoes] = useState<MapaPermissoes>({});
  const [loading, setLoading] = useState(true);

  async function carregarPerfil(userId: string) {
    try {
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .single();

      if (perfilError) throw perfilError;

      const { data: permData } = await supabase
        .from('permissoes_perfil')
        .select('*')
        .eq('perfil_id', userId);

      const mapaPerms: MapaPermissoes = {};
      permData?.forEach((p: any) => {
        mapaPerms[p.modulo as keyof MapaPermissoes] = p;
      });

      setPerfil(perfilData);
      setPermissoes(mapaPerms);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        carregarPerfil(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          await carregarPerfil(session.user.id);
          setLoading(false);
        } else {
          setPerfil(null);
          setPermissoes({});
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(
    emailOrUsername: string,
    password: string,
  ): Promise<{ error: string | null }> {
    const email = emailOrUsername.includes('@')
      ? emailOrUsername
      : `${emailOrUsername}@ong.org`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login')) {
        return { error: 'Email ou senha incorretos.' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Por favor, confirme seu email antes de entrar.' };
      }
      return { error: error.message };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPerfil(null);
    setPermissoes({});
  }

  async function recarregarPerfil() {
    if (user) await carregarPerfil(user.id);
  }

  function podeFazer(
    modulo: keyof MapaPermissoes,
    acao: 'ver' | 'criar' | 'editar' | 'excluir',
  ): boolean {
    if (perfil?.cargo === 'admin_master' || perfil?.cargo === 'admin')
      return true;
    const perm = permissoes[modulo];
    if (!perm) return false;
    const campo = `pode_${acao}` as keyof typeof perm;
    return perm[campo] as boolean;
  }

  const cargo = perfil?.cargo as CargoUsuario | undefined;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        perfil,
        permissoes,
        loading,
        signIn,
        signOut,
        recarregarPerfil,
        podeFazer,
        isAdminMaster: cargo === 'admin_master',
        isAdmin: cargo === 'admin' || cargo === 'admin_master',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
