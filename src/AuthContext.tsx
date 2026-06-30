import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  nome: string;
  role: 'admin' | 'intermediario' | 'usuario' | 'visualizador';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isIntermediario: boolean;
  isUsuario: boolean;
  isVisualizador: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Verificar se token está expirado
  const isTokenExpired = (t: string): boolean => {
    try {
      const payload = JSON.parse(atob(t));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp ? payload.exp < now : false;
    } catch {
      return true;
    }
  };

  // Restaurar sessão do localStorage (com verificação de expiração)
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        if (isTokenExpired(savedToken)) {
          console.warn('⚠️ Token expirado. Fazendo logout automático...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          return;
        }
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  // Verificar expiração periodicamente (a cada 60 segundos)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.warn('⚠️ Token expirou. Forçando logout...');
        logout();
        alert('Sua sessão expirou. Faça login novamente.');
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (email: string, senha: string) => {
    try {
      console.log('🔐 Iniciando login para:', email);
      
      // Chamar o endpoint do servidor Express
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      console.log('✅ Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta:', response.status, error);
        throw new Error(error.error || 'Erro ao fazer login');
      }

      const { token, user } = await response.json();
      console.log('✅ Login bem-sucedido para:', email);

      // Salvar token e usuário
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify({
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      }));

      setToken(token);
      setUser({
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      });
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isIntermediario: user?.role === 'intermediario',
    isUsuario: user?.role === 'usuario',
    isVisualizador: user?.role === 'visualizador',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
