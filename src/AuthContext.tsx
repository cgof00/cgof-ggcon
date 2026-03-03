import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  nome: string;
  role: 'admin' | 'intermediario' | 'usuario';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para hash de senha (mesmo algoritmo usada no banco)
function hashPassword(password: string): string {
  let hash = 0;
  const salt = 'salt';
  const combined = password + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restaurar sessão do localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      console.log('🔐 Iniciando login para:', email);
      
      // Buscar usuário via proxy
      const emailEncoded = encodeURIComponent(email.toLowerCase());
      const queryUrl = `/api/supabase/rest/v1/usuarios?select=*&email=eq.${emailEncoded}`;
      
      console.log('🌐 Consultando usuário...', queryUrl);
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Erro na busca:', response.status, response.statusText);
        throw new Error('Email ou senha incorretos');
      }

      const usuarios = await response.json();
      
      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        console.error('❌ Usuário não encontrado');
        throw new Error('Email ou senha incorretos');
      }

      const data = usuarios[0];
      console.log('✅ Usuário encontrado:', data.id);

      // Verificar senha
      const hashedPassword = hashPassword(senha);
      if (hashedPassword !== data.senha) {
        console.error('❌ Senha incorreta');
        throw new Error('Email ou senha incorretos');
      }

      console.log('✅ Senha correta');

      // Gerar token simples (JWT em base64)
      const tokenPayload = {
        id: data.id,
        email: data.email,
        role: data.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
      };
      const token = btoa(JSON.stringify(tokenPayload));

      // Atualizar última sessão no banco (non-blocking)
      fetch(`/api/supabase/rest/v1/usuarios?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ultima_sessao: new Date().toISOString() }),
      }).catch(err => console.error('⚠️ Erro ao atualizar última sessão:', err));

      // Salvar token e usuário
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify({
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
      }));

      setToken(token);
      setUser({
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
      });

      console.log('✅ Login bem-sucedido para:', email);
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
