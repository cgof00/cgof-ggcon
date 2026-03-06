import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from './AuthContext';
import logoImg from './img/logo.png';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-200"
      >
        <div className="text-center mb-8">
          {/* Logo */}
          <img 
            src={logoImg} 
            alt="Logo" 
            className="h-24 mx-auto mb-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900">Controle Formalização</h1>
          <p className="text-[#1351B4] font-semibold mt-2">CGOF - GGCON</p>
        </div>

        {erro && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-gap-3"
          >
            <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
            <p className="text-sm text-red-600">{erro}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-3.5 text-[#1351B4] w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/20 bg-white text-gray-900 placeholder:text-gray-400 transition-all"
                placeholder="seu@email.com"
                required
                disabled={carregando}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 ml-1">Senha</label>
            <div className="relative mt-2">
              <Lock className="absolute left-4 top-3.5 text-[#1351B4] w-5 h-5" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/20 bg-white text-gray-900 placeholder:text-gray-400 transition-all"
                placeholder="••••••••"
                required
                disabled={carregando}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-4 top-3.5 text-[#1351B4] hover:text-[#0C326F] focus:outline-none"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {mostrarSenha ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.221 1.125-4.575M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364-2.364A9.956 9.956 0 0122 9c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.636-1.364" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.828-2.828A9.956 9.956 0 0122 12c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.21.896-4.21 2.343-5.657" /></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1351B4] text-white font-bold py-3 rounded-xl mt-8 hover:bg-[#0C326F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200/50"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 mt-6 font-semibold">
          Secretaria da Saúde - São Paulo
        </div>
      </motion.div>
    </div>
  );
}
