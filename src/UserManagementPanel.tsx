import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Shield, UserCheck, AlertCircle, Copy, CheckCircle, X, Key, Lock, Edit3, Loader2, MoreVertical } from 'lucide-react';
import { useAuth } from './AuthContext';

interface Usuario {
  id: number;
  email: string;
  nome: string;
  role: 'admin' | 'usuario';
  ativo: boolean;
  created_at: string;
}

interface UserManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementPanel({ isOpen, onClose }: UserManagementPanelProps) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', nome: '', role: 'usuario' as 'admin' | 'usuario', senha: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [senhaTemporaria, setSenhaTemporaria] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [usuarioParaDeletar, setUsuarioParaDeletar] = useState<Usuario | null>(null);
  const [senhaParaDeletar, setSenhaParaDeletar] = useState('');

  const [deletando, setDeletando] = useState(false);
  const [deleteErro, setDeleteErro] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Edit user modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ nome: '', email: '', role: 'usuario' as 'admin' | 'usuario' });
  const [editUsuarioId, setEditUsuarioId] = useState<number | null>(null);

  // Hamburger menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Apenas admins podem acessar esse painel
  if (user?.role !== 'admin') {
    return null;
  }

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      setErro('');
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        const errorMsg = 'Token não encontrado. Faça login novamente.';
        setErro(errorMsg);
        return;
      }
      const response = await fetch('/api/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsuarios(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar usuários';
      setErro(errorMsg);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarUsuarios();
    }
  }, [isOpen]);

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSuccessMessage('');
    setSenhaTemporaria('');

    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        const errorMsg = 'Token não encontrado. Faça login novamente.';
        setErro(errorMsg);
        return;
      }

      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setSenhaTemporaria(data.senhaTemporaria);
      setSuccessMessage(`Usuário criado com sucesso! Senha temporária: ${data.senhaTemporaria}`);
      setFormData({ email: '', nome: '', role: 'usuario', senha: '' });
      
      // Recarregar lista
      setTimeout(() => {
        carregarUsuarios();
        setShowModal(false);
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao criar usuário';
      setErro(errorMsg);
    }
  };

  const handleToggleAtivo = async (id: number, novoStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        const msg = 'Token não encontrado. Faça login novamente.';
        setErro(msg);
        return;
      }

      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: novoStatus })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar usuário');
      }

      carregarUsuarios();
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar usuário';
      setErro(msg);
    }
  };

  const handleDeletarUsuario = async (id: number) => {
    const usuarioADeletar = usuarios.find(u => u.id === id);
    if (!usuarioADeletar) return;
    
    setUsuarioParaDeletar(usuarioADeletar);
    setSenhaParaDeletar('');
    setDeleteErro('');
    setDeleteSuccess('');
    setDeletando(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmarDeletarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteErro('');
    setDeleteSuccess('');

    if (!usuarioParaDeletar) {
      setDeleteErro('Usuário não selecionado');
      return;
    }

    if (!senhaParaDeletar) {
      setDeleteErro('Senha é obrigatória');
      return;
    }

    setDeletando(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setDeleteErro('Token não encontrado. Faça login novamente.');
        setDeletando(false);
        return;
      }

      const response = await fetch(`/api/admin/usuarios/${usuarioParaDeletar.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha: senhaParaDeletar })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao deletar usuário' }));
        throw new Error(errorData.error || 'Erro ao deletar usuário');
      }

      setDeleteSuccess('Usuário excluído com sucesso!');
      setSenhaParaDeletar('');
      setTimeout(() => {
        setShowDeleteConfirmModal(false);
        setUsuarioParaDeletar(null);
        setDeleteErro('');
        setDeleteSuccess('');
        carregarUsuarios();
      }, 1500);
    } catch (err: any) {
      setDeleteErro(err.message || 'Erro ao deletar usuário');
    } finally {
      setDeletando(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSuccessMessage('');

    if (!usuarioSelecionado) {
      const msg = 'Usuário não selecionado';
      setErro(msg);
      return;
    }

    if (!novaSenha || novaSenha.trim().length < 6) {
      const msg = 'Senha deve ter no mínimo 6 caracteres';
      setErro(msg);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        const msg = 'Token não encontrado. Faça login novamente.';
        setErro(msg);
        return;
      }

      const response = await fetch(`/api/admin/usuarios/${usuarioSelecionado.id}/senha`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ senha: novaSenha })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao alterar senha');
      }

      setSuccessMessage(`Senha alterada com sucesso para ${usuarioSelecionado.email}`);
      setNovaSenha('');
      setTimeout(() => {
        setShowSenhaModal(false);
      }, 2000);
    } catch (err: any) {
      const msg = err.message || 'Erro ao alterar senha';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200 p-6 flex justify-between items-center sticky top-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Users className="text-white w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Gerenciar Usuários</h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-4">
              <button
                onClick={() => {
                  setShowModal(true);
                }}
                className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-bold"
              >
                <Plus className="w-5 h-5" />
                Novo Usuário
              </button>

              {erro && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <AlertCircle className="text-red-600 w-5 h-5" />
                  <p className="text-red-700 text-sm">{erro}</p>
                </motion.div>
              )}

              {carregando ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">Carregando usuários...</p>
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">Nenhum usuário encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usuarios.map((u) => (
                    <div key={u.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-slate-900">{u.nome}</p>
                          <p className="text-xs text-slate-600">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            u.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          {/* Hamburger menu */}
                          <div className="relative" ref={openMenuId === u.id ? menuRef : undefined}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                              className="p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800"
                              title="Ações"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {openMenuId === u.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-lg border border-slate-200 w-44 py-1 overflow-hidden"
                                >
                                  <button
                                    onClick={() => { setOpenMenuId(null); abrirEditModal(u); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => { setOpenMenuId(null); handleToggleAtivo(u.id, !u.ativo); }}
                                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                                      u.ativo ? 'text-red-700 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'
                                    }`}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {u.ativo ? 'Desativar' : 'Ativar'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setUsuarioSelecionado(u);
                                      setNovaSenha('');
                                      setErro('');
                                      setSuccessMessage('');
                                      setShowSenhaModal(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                    Alterar Senha
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={() => { setOpenMenuId(null); handleDeletarUsuario(u.id); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Deletar
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.role === 'admin' ? (
                          <>
                            <Shield className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-medium text-orange-600">Administrador</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">Padrão</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ===== MODALS — outside the animated panel (transform breaks fixed positioning) ===== */}

          {/* Modal de Editar Usuário */}
          <AnimatePresence>
            {showEditModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEditModal(false)}
                  className="fixed inset-0 bg-black/50 z-[60]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-[70] p-4"
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 p-2 rounded-lg">
                            <Edit3 className="text-white w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Editar Usuário</h3>
                        </div>
                        <button
                          onClick={() => setShowEditModal(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {successMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <CheckCircle className="text-green-600 w-5 h-5" />
                          <p className="text-green-700 text-sm font-semibold">{successMessage}</p>
                        </motion.div>
                      )}

                      {erro && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <AlertCircle className="text-red-600 w-5 h-5" />
                          <p className="text-red-700 text-sm">{erro}</p>
                        </motion.div>
                      )}

                      <form onSubmit={handleEditarUsuario} className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Nome</label>
                          <input
                            type="text"
                            value={editFormData.nome}
                            onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Perfil</label>
                          <select
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'usuario' })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          >
                            <option value="usuario">Usuário Padrão</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Modal de Criar Usuário */}
          <AnimatePresence>
            {showModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowModal(false)}
                  className="fixed inset-0 bg-black/50 z-[60]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-[70] p-4"
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Criar Novo Usuário</h3>
                        <button
                          onClick={() => setShowModal(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {successMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-green-700 text-sm font-semibold">Sucesso!</p>
                              <p className="text-green-600 text-xs mt-1">{successMessage}</p>
                              <button
                                onClick={copiarSenha}
                                className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                  copiado
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {copiado ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copiar senha
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {erro && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <AlertCircle className="text-red-600 w-5 h-5" />
                          <p className="text-red-700 text-sm">{erro}</p>
                        </motion.div>
                      )}

                      <form onSubmit={handleCriarUsuario} className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Nome</label>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            placeholder="Nome completo"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            placeholder="email@example.com"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Papel</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'usuario' })}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          >
                            <option value="usuario">Usuário Padrão</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors mt-6"
                        >
                          Criar Usuário
                        </button>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Modal de Alterar Senha */}
          <AnimatePresence>
            {showSenhaModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSenhaModal(false)}
                  className="fixed inset-0 bg-black/50 z-[60]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-[70] p-4"
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 p-2 rounded-lg">
                            <Lock className="text-white w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Alterar Senha</h3>
                        </div>
                        <button
                          onClick={() => setShowSenhaModal(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {usuarioSelecionado && (
                        <p className="text-sm text-slate-600 mb-4">
                          Usuário: <span className="font-bold">{usuarioSelecionado.email}</span>
                        </p>
                      )}

                      {successMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-green-700 text-sm font-semibold">Sucesso!</p>
                              <p className="text-green-600 text-xs mt-1">{successMessage}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {erro && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <AlertCircle className="text-red-600 w-5 h-5" />
                          <p className="text-red-700 text-sm">{erro}</p>
                        </motion.div>
                      )}

                      <form onSubmit={handleAlterarSenha} className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Nova Senha</label>
                          <input
                            type="password"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Mínimo 6 caracteres"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors mt-6"
                        >
                          Alterar Senha
                        </button>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Modal de Confirmar Exclusão */}
          <AnimatePresence>
            {showDeleteConfirmModal && usuarioParaDeletar && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => { if (!deletando) setShowDeleteConfirmModal(false); }}
                  className="fixed inset-0 bg-black/50 z-[60]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-[70] p-4"
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-600 p-2 rounded-lg">
                            <Trash2 className="text-white w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Excluir Usuário</h3>
                        </div>
                        <button
                          onClick={() => { if (!deletando) setShowDeleteConfirmModal(false); }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <p className="text-sm font-bold text-red-800">Ação irreversível</p>
                        </div>
                        <p className="text-sm text-red-700">
                          Usuário: <span className="font-bold">{usuarioParaDeletar.nome}</span>
                        </p>
                        <p className="text-xs text-red-600 mt-1">{usuarioParaDeletar.email}</p>
                        <p className="text-xs text-red-500 mt-2">
                          Esta ação irá desativar permanentemente este usuário.
                          Digite sua senha de administrador para confirmar.
                        </p>
                      </div>

                      {deleteSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <CheckCircle className="text-green-600 w-5 h-5" />
                          <p className="text-green-700 text-sm font-semibold">{deleteSuccess}</p>
                        </motion.div>
                      )}

                      {deleteErro && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3"
                        >
                          <AlertCircle className="text-red-600 w-5 h-5" />
                          <p className="text-red-700 text-sm">{deleteErro}</p>
                        </motion.div>
                      )}

                      <form onSubmit={confirmarDeletarUsuario} className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-slate-700 ml-1">Sua Senha de Admin</label>
                          <input
                            type="password"
                            value={senhaParaDeletar}
                            onChange={(e) => setSenhaParaDeletar(e.target.value)}
                            className="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-base"
                            placeholder="Digite sua senha para confirmar"
                            required
                            autoFocus
                            disabled={deletando}
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => { if (!deletando) setShowDeleteConfirmModal(false); }}
                            disabled={deletando}
                            className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={deletando || !senhaParaDeletar}
                            className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletando ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Excluindo...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Confirmar Exclusão
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
