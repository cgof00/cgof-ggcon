import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, senha);
    } catch (error: any) {
      setErro(error.message || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Gestor de Emendas</h1>
          <p className="text-slate-500 mt-2">Faça login para continuar</p>
        </div>

        {erro && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-gap-3"
          >
            <AlertCircle className="text-red-600 w-5 h-5 shrink-0" />
            <p className="text-sm text-red-700">{erro}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-bold text-slate-500 ml-1">Email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="seu@email.com"
                required
                disabled={carregando}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-500 ml-1">Senha</label>
            <div className="relative mt-2">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="••••••••"
                required
                disabled={carregando}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-8 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Credenciais padrão para teste:
          <br />
          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded ml-2">admin@gestor-emendas.com</span>
          <br />
          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded ml-2">admin123</span>
        </p>
      </motion.div>
    </div>
  );
}
