import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Shield, UserCheck, AlertCircle, Copy, CheckCircle, X, Key, Lock, BarChart3, TrendingUp, FileText, CheckCheck } from 'lucide-react';
import { useAuth } from './AuthContext';

interface Usuario {
  id: number;
  email: string;
  nome: string;
  role: 'admin' | 'usuario';
  ativo: boolean;
  created_at: string;
}

export function AdminPanel() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', nome: '', role: 'usuario', senha: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [senhaTemporaria, setSenhaTemporaria] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [usuarioParaDeletar, setUsuarioParaDeletar] = useState<Usuario | null>(null);
  const [senhaParaDeletar, setSenhaParaDeletar] = useState('');

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Apenas admins podem acessar esse painel
  if (user?.role !== 'admin') {
    console.log('❌ Usuário não é admin, AdminPanel não renderizado');
    return null;
  }

  console.log('✅ AdminPanel renderizado para admin:', user?.email);

  const carregarUsuarios = async () => {
    try {
      console.log('📥 Carregando usuários...');
      setCarregando(true);
      setErro('');
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'NÃO ENCONTRADO');
      
      if (!token) {
        const errorMsg = 'Token não encontrado. Faça login novamente.';
        console.error('❌', errorMsg);
        setErro(errorMsg);
        return;
      }
      const response = await fetch('/api/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        const errorMsg = `Erro HTTP ${response.status}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('✅ Usuários carregados:', data.length);
      setUsuarios(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar usuários';
      console.error('🔴 Erro ao carregar usuários:', errorMsg);
      setErro(errorMsg);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
    carregarDashboard();
  }, []);

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🟡 handleCriarUsuario chamado');
    setErro('');
    setSuccessMessage('');
    setSenhaTemporaria('');

    try {
      console.log('📝 Dados do formulário:', formData);
      
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token encontrado:', !!token);
      
      if (!token) {
        const errorMsg = 'Token não encontrado. Faça login novamente.';
        console.error('❌', errorMsg);
        setErro(errorMsg);
        return;
      }

      console.log('🚀 Enviando requisição POST /api/admin/usuarios');
      console.log('📌 URL: /api/admin/usuarios');
      console.log('📌 Headers: Content-Type: application/json, Authorization: Bearer [token]');
      console.log('📌 Body:', JSON.stringify(formData));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para debug
      
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('✅ Fetch completou');
      console.log('📊 Response status:', response.status);
      console.log('📊 Response statusText:', response.statusText);
      console.log('📊 Response headers:', response.headers);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erro JSON da resposta:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ Erro ao parsear resposta:', text);
          errorData = { error: text };
        }
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Usuário criado:', data);
      
      setSenhaTemporaria(data.senhaTemporaria);
      setSuccessMessage(`Usuário criado com sucesso! Senha temporária: ${data.senhaTemporaria}`);
      setFormData({ email: '', nome: '', role: 'usuario', senha: '' });
      
      // Recarregar lista
      setTimeout(() => {
        carregarUsuarios();
        setShowModal(false);
      }, 2000);
    } catch (err: any) {
      let errorMsg = err.message || 'Erro ao criar usuário';
      if (err.name === 'AbortError') {
        errorMsg = 'Timeout - Servidor não respondeu em 30 segundos. Verifique se o servidor está rodando e veja os logs.';
      }
      console.error('🔴 Erro:', errorMsg);
      console.error('🔴 Stack:', err.stack);
      setErro(errorMsg);
    }
  };

  const handleToggleAtivo = async (id: number, novoStatus: boolean) => {
    console.log('🔄 handleToggleAtivo chamado - ID:', id, 'Novo Status:', novoStatus);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token encontrado:', !!token);
      if (!token) {
        const msg = 'Token não encontrado. Faça login novamente.';
        console.error('❌', msg);
        setErro(msg);
        return;
      }

      const url = `/api/usuarios/${id}`;
      console.log('🚀 Enviando PUT para:', url);
      console.log('📌 Body:', JSON.stringify({ ativo: novoStatus }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para debug

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: novoStatus }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('✅ Fetch completou');
      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erro JSON da resposta:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ Erro ao parsear resposta:', text);
          errorData = { error: text };
        }
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }

      console.log('✅ Usuário atualizado com sucesso');
      carregarUsuarios();
    } catch (err: any) {
      let msg = err.message || 'Erro ao atualizar usuário';
      if (err.name === 'AbortError') {
        msg = 'Timeout - Servidor não respondeu em 30 segundos. Verifique se o servidor está rodando e veja os logs.';
      }
      console.error('🔴 Erro:', msg);
      console.error('🔴 Stack:', err.stack);
      setErro(msg);
    }
  };

  const handleDeletarUsuario = async (id: number) => {
    console.log('🗑️ handleDeletarUsuario chamado - ID:', id);
    const usuarioADeletar = usuarios.find(u => u.id === id);
    if (!usuarioADeletar) return;
    
    setUsuarioParaDeletar(usuarioADeletar);
    setSenhaParaDeletar('');
    setErro('');
    setSuccessMessage('');
    setShowDeleteConfirmModal(true);
  };

  const confirmarDeletarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🗑️ confirmarDeletarUsuario com senha');
    setErro('');
    setSuccessMessage('');

    if (!usuarioParaDeletar) {
      const msg = 'Usuário não selecionado';
      console.error('❌', msg);
      setErro(msg);
      return;
    }

    if (!senhaParaDeletar) {
      const msg = 'Senha é obrigatória';
      console.error('❌', msg);
      setErro(msg);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token encontrado:', !!token);
      if (!token) {
        const msg = 'Token não encontrado. Faça login novamente.';
        console.error('❌', msg);
        setErro(msg);
        return;
      }

      const url = `/api/admin/usuarios/${usuarioParaDeletar.id}`;
      console.log('🚀 Enviando DELETE para:', url);
      console.log('📌 Body:', JSON.stringify({ senha: '****' }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para debug

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha: senhaParaDeletar }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('✅ Fetch completou');
      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erro JSON da resposta:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ Erro ao parsear resposta:', text);
          errorData = { error: text };
        }
        throw new Error(errorData.error || 'Erro ao deletar usuário');
      }

      console.log('✅ Usuário deletado com sucesso');
      setErro('');
      setSuccessMessage('Usuário deletado com sucesso');
      setSenhaParaDeletar('');
      setTimeout(() => {
        setShowDeleteConfirmModal(false);
        setUsuarioParaDeletar(null);
        carregarUsuarios();
      }, 1500);
    } catch (err: any) {
      let msg = err.message || 'Erro ao deletar usuário';
      if (err.name === 'AbortError') {
        msg = 'Timeout - Servidor não respondeu em 30 segundos. Verifique se o servidor está rodando e veja os logs.';
      }
      console.error('🔴 Erro:', msg);
      console.error('🔴 Stack:', err.stack);
      setErro(msg);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 handleAlterarSenha chamado');
    setErro('');
    setSuccessMessage('');

    if (!usuarioSelecionado) {
      const msg = 'Usuário não selecionado';
      console.error('❌', msg);
      setErro(msg);
      return;
    }

    console.log('📝 Usuário selecionado:', usuarioSelecionado.email);
    console.log('📝 Nova senha:', novaSenha ? novaSenha.substring(0, 3) + '****' : 'VAZIA');

    if (!novaSenha || novaSenha.trim().length < 6) {
      const msg = 'Senha deve ter no mínimo 6 caracteres';
      console.error('❌', msg);
      setErro(msg);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token encontrado:', !!token);
      if (!token) {
        const msg = 'Token não encontrado. Faça login novamente.';
        console.error('❌', msg);
        setErro(msg);
        return;
      }

      const url = `/api/admin/usuarios/${usuarioSelecionado.id}/senha`;
      console.log('🚀 Enviando PUT para:', url);
      console.log('📌 Body:', JSON.stringify({ senha: novaSenha.substring(0, 3) + '****' }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundo timeout para debug

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ senha: novaSenha }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('✅ Fetch completou');
      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erro JSON da resposta:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ Erro ao parsear resposta:', text);
          errorData = { error: text };
        }
        throw new Error(errorData.error || 'Erro ao alterar senha');
      }

      console.log('✅ Senha alterada com sucesso');
      setSuccessMessage(`Senha alterada com sucesso para ${usuarioSelecionado.email}`);
      setNovaSenha('');
      setTimeout(() => {
        setShowSenhaModal(false);
      }, 2000);
    } catch (err: any) {
      let msg = err.message || 'Erro ao alterar senha';
      if (err.name === 'AbortError') {
        msg = 'Timeout - Servidor não respondeu em 30 segundos. Verifique se o servidor está rodando e veja os logs.';
      }
      console.error('🔴 Erro:', msg);
      console.error('🔴 Stack:', err.stack);
      setErro(msg);
    }
  };

  const copiarSenha = () => {
    navigator.clipboard.writeText(senhaTemporaria);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const carregarDashboard = async () => {
    try {
      setDashboardLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) return;

      // Buscar APENAS formalizações
      const formRes = await fetch('/api/formalizacao', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const formalizacoes = formRes.ok ? await formRes.json() : [];

      // Total de Emendas: contar registros com coluna "emenda" preenchida
      const totalEmendas = formalizacoes.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;

      // Total de Demandas: contar registros com coluna "demandas_formalizacao" preenchida
      const totalDemandas = formalizacoes.filter((f: any) => f.demandas_formalizacao && String(f.demandas_formalizacao).trim() !== '').length;

      // Quantidade por técnico (concluída/não concluída)
      const tecnicoMap = new Map<string, { concluida: number; nao_concluida: number }>();
      formalizacoes.forEach((f: any) => {
        const tecnico = f.tecnico || 'Sem Técnico';
        const tem_conclusao = f.concluida_em && f.concluida_em.trim() !== '';
        
        if (!tecnicoMap.has(tecnico)) {
          tecnicoMap.set(tecnico, { concluida: 0, nao_concluida: 0 });
        }
        
        const stats = tecnicoMap.get(tecnico)!;
        if (tem_conclusao) {
          stats.concluida++;
        } else {
          stats.nao_concluida++;
        }
      });

      const demandaPorTecnico = Array.from(tecnicoMap.entries()).map(([tecnico, stats]) => ({
        tecnico,
        concluida: stats.concluida,
        nao_concluida: stats.nao_concluida,
        total: stats.concluida + stats.nao_concluida
      })).sort((a, b) => b.total - a.total);

      // Situação da Demanda por Área-Estágio
      const situacaoMap = new Map<string, number>();
      const situacoes = [
        'DEMANDA COM O TÉCNICO',
        'EM ANÁLISE DA DOCUMENTAÇÃO',
        'EM ANÁLISE DO PLANO DE TRABALHO',
        'AGUARDANDO DOCUMENTAÇÃO',
        'DEMANDA EM DILIGÊNCIA',
        'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS',
        'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS',
        'COMITÊ GESTOR',
        'OUTRAS PENDÊNCIAS',
        'EM FORMALIZAÇÃO',
        'EM CONFERÊNCIA',
        'CONFERÊNCIA COM PENDÊNCIA',
        'EM ASSINATURA',
        'EMPENHO CANCELADO',
        'LAUDAS',
        'PUBLICAÇÃO NO DOE',
        'PROCESSO SIAFEM'
      ];

      situacoes.forEach(situacao => {
        const count = formalizacoes.filter((f: any) => {
          const areaEstagio = f.area_estagio_situacao_demanda || '';
          return areaEstagio.toUpperCase().includes(situacao.toUpperCase());
        }).length;
        if (count > 0) {
          situacaoMap.set(situacao, count);
        }
      });

      const distribuicaoSituacao = Array.from(situacaoMap.entries())
        .map(([situacao, count]) => ({ situacao, count }))
        .sort((a, b) => b.count - a.count);

      setDashboardData({
        totalEmendas,
        totalDemandas,
        demandaPorTecnico,
        distribuicaoSituacao
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const copiarSenha_old = () => {
    navigator.clipboard.writeText(senhaTemporaria);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Section */}
      {dashboardLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-slate-600">Carregando dashboard...</p>
        </div>
      ) : dashboardData ? (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Total de Emendas</p>
                  <p className="text-4xl font-bold text-indigo-900">{dashboardData.totalEmendas}</p>
                </div>
                <div className="bg-indigo-200 p-3 rounded-xl">
                  <FileText className="text-indigo-700 w-6 h-6" />
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-6 border border-violet-200 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-2">Total de Demandas</p>
                  <p className="text-4xl font-bold text-violet-900">{dashboardData.totalDemandas}</p>
                </div>
                <div className="bg-violet-200 p-3 rounded-xl">
                  <CheckCheck className="text-violet-700 w-6 h-6" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Demandas por Técnico */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-amber-600 w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Demandas por Técnico</h3>
            </div>
            
            {dashboardData.demandaPorTecnico.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Técnico</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Concluídas</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Não Concluídas</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.demandaPorTecnico.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900 font-medium">{item.tecnico}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold text-xs">
                            {item.concluida}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold text-xs">
                            {item.nao_concluida}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">
                          {item.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">Nenhum técnico atribuído</p>
            )}
          </motion.div>

          {/* Situação da Demanda */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-emerald-600 w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Distribuição de Situação da Demanda</h3>
            </div>
            
            {dashboardData.distribuicaoSituacao.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.distribuicaoSituacao.map((item: any, idx: number) => {
                  const maxCount = Math.max(...dashboardData.distribuicaoSituacao.map((i: any) => i.count));
                  const percentage = (item.count / maxCount) * 100;
                  
                  const colors = [
                    { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
                    { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700' },
                    { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
                    { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700' },
                    { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700' },
                    { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700' },
                    { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700' },
                    { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700' },
                    { bg: 'bg-lime-500', light: 'bg-lime-100', text: 'text-lime-700' },
                    { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
                    { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700' },
                    { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-700' },
                    { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700' },
                    { bg: 'bg-sky-500', light: 'bg-sky-100', text: 'text-sky-700' },
                    { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700' },
                    { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
                    { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700' }
                  ];
                  const color = colors[idx % colors.length];
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700 flex-1 pr-4">
                          {item.situacao}
                        </label>
                        <div className={`${color.light} ${color.text} px-3 py-1 rounded-full font-bold text-sm min-w-12 text-center`}>
                          {item.count}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${color.bg} rounded-full shadow-md`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-slate-400 w-8 h-8" />
                </div>
                <p className="text-slate-500 font-medium">Nenhuma demanda com situação definida</p>
                <p className="text-slate-400 text-sm mt-1">Atualize os dados para ver as situações</p>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
