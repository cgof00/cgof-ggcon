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

// Helper para hash de senha
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
        console.error('❌ Erro ao restaurar sessão:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      console.log('🔐 Iniciando login para:', email);
      
      // Usar proxy via Cloudflare
      const emailEncoded = encodeURIComponent(email.toLowerCase());
      const path = `/rest/v1/usuarios?select=*&email=eq.${emailEncoded}`;
      const url = `/api/proxy?path=${encodeURIComponent(path)}`;
      
      console.log('🌐 URL proxy:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Erro na resposta:', response.status, text.substring(0, 200));
        throw new Error(`Erro: ${response.status}`);
      }

      const usuarios = await response.json();
      console.log('✅ Resposta recebida:', usuarios.length, 'usuários');
      
      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        console.error('❌ Usuário não encontrado');
        throw new Error('Email ou senha incorretos');
      }

      const userData = usuarios[0];
      console.log('✅ Usuário encontrado:', userData.id);

      // Verificar senha
      const hashedPassword = hashPassword(senha);
      if (hashedPassword !== userData.senha) {
        console.error('❌ Senha incorreta');
        throw new Error('Email ou senha incorretos');
      }

      console.log('✅ Senha correta');

      // Gerar token simples (JWT em base64)
      const tokenPayload = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
      };
      const newToken = btoa(JSON.stringify(tokenPayload));

      // Atualizar última sessão no banco (non-blocking)
      fetch(`/api/proxy?path=${encodeURIComponent(`/rest/v1/usuarios?id=eq.${userData.id}`)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ultima_sessao: new Date().toISOString() }),
      }).catch(err => console.error('⚠️ Erro ao atualizar última sessão:', err));

      // Salvar token e usuário
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify({
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        role: userData.role,
      }));

      setToken(newToken);
      setUser({
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        role: userData.role,
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
