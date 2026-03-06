import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Shield, UserCheck, AlertCircle, Copy, CheckCircle, X, Key, Lock, BarChart3, TrendingUp, FileText, CheckCheck, ChevronDown, ChevronRight, Filter, Calendar, MapPin, RefreshCw, Edit3, Mail, User as UserIcon } from 'lucide-react';
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

  // Edit user modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ nome: '', email: '', role: 'usuario' as 'admin' | 'usuario' });
  const [editUsuarioId, setEditUsuarioId] = useState<number | null>(null);

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rawFormalizacoes, setRawFormalizacoes] = useState<any[]>([]);

  // Collapsible card states
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Filter states
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroDataInicial, setFiltroDataInicial] = useState('');
  const [filtroDataFinal, setFiltroDataFinal] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  const toggleCard = (cardId: string) => {
    setCollapsedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Extract unique técnicos for filter dropdown
  const uniqueTecnicos = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.tecnico || 'Sem Técnico'))).sort();
  }, [rawFormalizacoes]);

  // Compute filtered dashboard data
  const displayData = useMemo(() => {
    if (!filtrosAtivos || !rawFormalizacoes.length) return dashboardData;

    let filtered = [...rawFormalizacoes];
    if (filtroTecnico) {
      filtered = filtered.filter((f: any) => (f.tecnico || 'Sem Técnico') === filtroTecnico);
    }
    if (filtroDataInicial) {
      filtered = filtered.filter((f: any) => {
        const d = f.data_entrada || f.created_at || '';
        return d >= filtroDataInicial;
      });
    }
    if (filtroDataFinal) {
      filtered = filtered.filter((f: any) => {
        const d = f.data_entrada || f.created_at || '';
        return d <= filtroDataFinal;
      });
    }

    const totalEmendas = filtered.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;
    const totalDemandas = filtered.filter((f: any) => f.demandas_formalizacao && String(f.demandas_formalizacao).trim() !== '').length;

    const tecnicoMap = new Map<string, { concluida: number; nao_concluida: number }>();
    filtered.forEach((f: any) => {
      const tecnico = f.tecnico || 'Sem Técnico';
      const tem_conclusao = f.concluida_em && String(f.concluida_em).trim() !== '';
      if (!tecnicoMap.has(tecnico)) tecnicoMap.set(tecnico, { concluida: 0, nao_concluida: 0 });
      const s = tecnicoMap.get(tecnico)!;
      if (tem_conclusao) s.concluida++; else s.nao_concluida++;
    });
    const demandaPorTecnico = Array.from(tecnicoMap.entries()).map(([tecnico, stats]) => ({
      tecnico, concluida: stats.concluida, nao_concluida: stats.nao_concluida, total: stats.concluida + stats.nao_concluida
    })).sort((a, b) => b.total - a.total);

    const situacoes = [
      'DEMANDA COM O TÉCNICO','EM ANÁLISE DA DOCUMENTAÇÃO','EM ANÁLISE DO PLANO DE TRABALHO',
      'AGUARDANDO DOCUMENTAÇÃO','DEMANDA EM DILIGÊNCIA','DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS',
      'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS','COMITÊ GESTOR','OUTRAS PENDÊNCIAS',
      'EM FORMALIZAÇÃO','EM CONFERÊNCIA','CONFERÊNCIA COM PENDÊNCIA','EM ASSINATURA',
      'EMPENHO CANCELADO','LAUDAS','PUBLICAÇÃO NO DOE','PROCESSO SIAFEM'
    ];
    const situacaoMap = new Map<string, number>();
    situacoes.forEach(sit => {
      const count = filtered.filter((f: any) => (f.area_estagio_situacao_demanda || '').toUpperCase().includes(sit)).length;
      if (count > 0) situacaoMap.set(sit, count);
    });
    const distribuicaoSituacao = Array.from(situacaoMap.entries())
      .map(([situacao, count]) => ({ situacao, count }))
      .sort((a, b) => b.count - a.count);

    return { totalEmendas, totalDemandas, demandaPorTecnico, distribuicaoSituacao };
  }, [rawFormalizacoes, dashboardData, filtrosAtivos, filtroTecnico, filtroDataInicial, filtroDataFinal]);

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

  const abrirEditModal = (u: Usuario) => {
    setEditUsuarioId(u.id);
    setEditFormData({ nome: u.nome, email: u.email, role: u.role });
    setErro('');
    setSuccessMessage('');
    setShowEditModal(true);
  };

  const handleEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSuccessMessage('');

    if (!editUsuarioId) return;

    if (!editFormData.nome.trim() || !editFormData.email.trim()) {
      setErro('Nome e email são obrigatórios');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErro('Token não encontrado. Faça login novamente.');
        return;
      }

      const response = await fetch(`/api/usuarios/${editUsuarioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: editFormData.nome.trim(),
          email: editFormData.email.trim(),
          role: editFormData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erro HTTP ${response.status}` }));
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }

      setSuccessMessage('Usuário atualizado com sucesso!');
      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMessage('');
        carregarUsuarios();
      }, 1500);
    } catch (err: any) {
      setErro(err.message || 'Erro ao atualizar usuário');
    }
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
      const formResult = formRes.ok ? await formRes.json() : [];
      const formalizacoes = Array.isArray(formResult) ? formResult : (formResult.data || []);
      setRawFormalizacoes(formalizacoes);

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
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[#1351B4]" />
          <h3 className="text-base font-bold text-slate-800">Filtros</h3>
          {filtrosAtivos && (
            <span className="ml-2 text-xs bg-[#1351B4] text-white px-2 py-0.5 rounded-full">Ativos</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico</label>
            <select
              value={filtroTecnico}
              onChange={e => setFiltroTecnico(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
            >
              <option value="">Todos</option>
              {uniqueTecnicos.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filtroDataInicial}
                onChange={e => setFiltroDataInicial(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filtroDataFinal}
                onChange={e => setFiltroDataFinal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setFiltrosAtivos(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1351B4] hover:bg-[#0C326F] text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Aplicar
            </button>
            <button
              onClick={() => {
                setFiltroTecnico('');
                setFiltroDataInicial('');
                setFiltroDataFinal('');
                setFiltroRegional('');
                setFiltrosAtivos(false);
              }}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      {dashboardLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <RefreshCw className="w-8 h-8 text-[#1351B4] animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Carregando dashboard...</p>
        </div>
      ) : displayData ? (
        <div className="space-y-5">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#1351B4]/5 to-[#1351B4]/15 rounded-2xl p-6 border border-[#1351B4]/20 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1351B4] uppercase tracking-wider mb-2">Total de Emendas</p>
                  <p className="text-4xl font-bold text-[#0C326F]">{displayData.totalEmendas}</p>
                </div>
                <div className="bg-[#1351B4]/15 p-3 rounded-xl">
                  <FileText className="text-[#1351B4] w-6 h-6" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#0C326F]/5 to-[#0C326F]/15 rounded-2xl p-6 border border-[#0C326F]/20 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0C326F] uppercase tracking-wider mb-2">Total de Demandas</p>
                  <p className="text-4xl font-bold text-[#0C326F]">{displayData.totalDemandas}</p>
                </div>
                <div className="bg-[#0C326F]/15 p-3 rounded-xl">
                  <CheckCheck className="text-[#0C326F] w-6 h-6" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Demandas por Técnico - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
          >
            <button
              onClick={() => toggleCard('tecnico')}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1351B4] to-[#0C326F] text-white hover:from-[#0C326F] hover:to-[#1351B4] transition-all"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-base font-bold">Demandas por Técnico</h3>
              </div>
              {collapsedCards['tecnico'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['tecnico'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    {displayData.demandaPorTecnico.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-[#1351B4]/20">
                              <th className="text-left px-4 py-3 font-bold text-[#0C326F]">Técnico</th>
                              <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Concluídas</th>
                              <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Não Concluídas</th>
                              <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayData.demandaPorTecnico.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-[#1351B4]/5 transition-colors">
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
                                <td className="px-4 py-3 text-center font-bold text-[#0C326F]">{item.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nenhum técnico atribuído</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Distribuição de Situação - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
          >
            <button
              onClick={() => toggleCard('situacao')}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1351B4] to-[#0C326F] text-white hover:from-[#0C326F] hover:to-[#1351B4] transition-all"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-base font-bold">Distribuição de Situação da Demanda</h3>
              </div>
              {collapsedCards['situacao'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['situacao'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    {displayData.distribuicaoSituacao.length > 0 ? (
                      <div className="space-y-4">
                        {displayData.distribuicaoSituacao.map((item: any, idx: number) => {
                          const maxCount = Math.max(...displayData.distribuicaoSituacao.map((i: any) => i.count));
                          const percentage = (item.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700 flex-1 pr-4">
                                  {item.situacao}
                                </label>
                                <div className="bg-[#1351B4]/10 text-[#1351B4] px-3 py-1 rounded-full font-bold text-sm min-w-12 text-center">
                                  {item.count}
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className="h-full bg-gradient-to-r from-[#1351B4] to-[#0C326F] rounded-full shadow-md"
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : null}

      {/* ===== GERENCIAMENTO DE USUÁRIOS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1351B4] to-[#0C326F]">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" />
            <h3 className="text-base font-bold">Gerenciamento de Usuários</h3>
            <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{usuarios.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={carregarUsuarios}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => {
                setFormData({ email: '', nome: '', role: 'usuario', senha: '' });
                setErro('');
                setSuccessMessage('');
                setSenhaTemporaria('');
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#1351B4] text-xs font-bold rounded-lg px-3 py-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Usuário
            </button>
          </div>
        </div>

        <div className="p-6">
          {erro && !showModal && !showEditModal && !showDeleteConfirmModal && !showSenhaModal && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-[#1351B4] animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Carregando usuários...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1351B4]/20">
                    <th className="text-left px-4 py-3 font-bold text-[#0C326F]">Nome</th>
                    <th className="text-left px-4 py-3 font-bold text-[#0C326F]">Email</th>
                    <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Perfil</th>
                    <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Status</th>
                    <th className="text-center px-4 py-3 font-bold text-[#0C326F]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-[#1351B4]/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAtivo(u.id, !u.ativo)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            u.ativo
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => abrirEditModal(u)}
                            className="p-1.5 rounded-lg text-[#1351B4] hover:bg-[#1351B4]/10 transition-colors"
                            title="Editar usuário"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setUsuarioSelecionado(u);
                              setNovaSenha('');
                              setErro('');
                              setSuccessMessage('');
                              setShowSenhaModal(true);
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Alterar senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletarUsuario(u.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Deletar usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ===== MODAL: CRIAR USUÁRIO ===== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#1351B4] to-[#0C326F] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5" />
                  <h3 className="font-bold">Novo Usuário</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {erro}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                {senhaTemporaria && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Senha temporária:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white border px-3 py-1 rounded text-sm font-mono flex-1">{senhaTemporaria}</code>
                      <button type="button" onClick={copiarSenha} className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                        {copiado ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Perfil</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Senha (opcional - será gerada automaticamente)</label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                    placeholder="Deixe vazio para gerar automaticamente"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1351B4] hover:bg-[#0C326F] text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  Criar Usuário
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL: EDITAR USUÁRIO ===== */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#1351B4] to-[#0C326F] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="font-bold">Editar Usuário</h3>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditarUsuario} className="p-6 space-y-4">
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {erro}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> Nome</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Perfil</span>
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'usuario' })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none"
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#1351B4] hover:bg-[#0C326F] text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL: ALTERAR SENHA ===== */}
      <AnimatePresence>
        {showSenhaModal && usuarioSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSenhaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Key className="w-5 h-5" />
                  <h3 className="font-bold">Alterar Senha</h3>
                </div>
                <button onClick={() => setShowSenhaModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAlterarSenha} className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <p className="text-slate-500 text-xs">Alterando senha de:</p>
                  <p className="font-semibold text-slate-800">{usuarioSelecionado.nome}</p>
                  <p className="text-slate-500 text-xs">{usuarioSelecionado.email}</p>
                </div>
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {erro}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha (mín. 6 caracteres)</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none"
                    required
                    minLength={6}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  Alterar Senha
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL: CONFIRMAR EXCLUSÃO ===== */}
      <AnimatePresence>
        {showDeleteConfirmModal && usuarioParaDeletar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="font-bold">Confirmar Exclusão</h3>
                </div>
                <button onClick={() => setShowDeleteConfirmModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={confirmarDeletarUsuario} className="p-6 space-y-4">
                <div className="bg-red-50 rounded-lg p-3 text-sm">
                  <p className="text-red-600 font-semibold">Tem certeza que deseja desativar este usuário?</p>
                  <p className="text-slate-700 mt-1">{usuarioParaDeletar.nome} ({usuarioParaDeletar.email})</p>
                </div>
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {erro}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sua senha de administrador</label>
                  <input
                    type="password"
                    value={senhaParaDeletar}
                    onChange={(e) => setSenhaParaDeletar(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
