/**
 * AdminSidebar.tsx
 * Collapsible left sidebar for administrative tools.
 * Premium corporate design — SAP Fiori / Salesforce Lightning inspired.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Upload,
  PenLine,
  RefreshCw,
  ClipboardList,
  LogOut,
  BarChart3,
  Database,
  KeyRound,
} from 'lucide-react';

export interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  canViewDashboard: boolean;
  userName: string;
  userRole: string;
  // Admin actions
  onManageUsers: () => void;
  onImportEmendas: () => void;
  onUpdateCampos: () => void;
  onForceReload: () => void;
  onViewLogs: () => void;
  // Common actions
  onDemonstrativoLote: () => void;
  onTrocarSenha: () => void;
  onAtualizarBD: () => void;
  onLogout: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isOpen: boolean;
  badge?: number;
  variant?: 'default' | 'danger' | 'accent';
  title?: string;
}

function NavItem({ icon, label, onClick, isOpen, badge, variant = 'default', title }: NavItemProps) {
  const variantClasses = {
    default: 'text-slate-300 hover:text-white hover:bg-white/10',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
    accent: 'text-blue-300 hover:text-white hover:bg-blue-500/20',
  };

  return (
    <button
      onClick={onClick}
      title={title || label}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium group relative ${variantClasses[variant]}`}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 bg-amber-400 text-slate-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

interface SectionHeaderProps {
  label: string;
  isOpen: boolean;
}

function SectionHeader({ label, isOpen }: SectionHeaderProps) {
  if (!isOpen) {
    return <div className="my-1 border-t border-white/10" />;
  }
  return (
    <div className="px-3 pt-4 pb-1">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
      >
        {label}
      </motion.p>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  intermediario: 'Intermediário',
  usuario: 'Usuário',
  visualizador: 'Visualizador',
};

export function AdminSidebar({
  isOpen,
  onToggle,
  isAdmin,
  canViewDashboard,
  userName,
  userRole,
  onManageUsers,
  onImportEmendas,
  onUpdateCampos,
  onForceReload,
  onViewLogs,
  onDemonstrativoLote,
  onTrocarSenha,
  onAtualizarBD,
  onLogout,
}: AdminSidebarProps) {
  const sidebarWidth = isOpen ? 220 : 60;

  // Detecta mobile para mudar entre overlay (fixed) e flex-child (desktop)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <motion.aside
      initial={isMobile ? { x: -220, width: 220 } : { width: 60 }}
      animate={
        isMobile
          ? { x: isOpen ? 0 : -220, width: 220 }
          : { x: 0, width: sidebarWidth }
      }
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex-shrink-0 bg-[#071d42] border-r border-white/10 flex flex-col
                 fixed top-14 bottom-0 left-0 z-40
                 md:static md:top-auto md:bottom-auto md:z-auto"
      style={{ minHeight: 0 }}
    >



      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {/* Admin Tools */}
        {isAdmin && (
          <>
            <SectionHeader label="Administração" isOpen={isOpen} />
            <NavItem
              icon={<Users className="w-4 h-4" />}
              label="Gerenciar Usuários"
              onClick={onManageUsers}
              isOpen={isOpen}
            />
            <NavItem
              icon={<Upload className="w-4 h-4" />}
              label="Importar Emendas"
              onClick={onImportEmendas}
              isOpen={isOpen}
            />
            <NavItem
              icon={<PenLine className="w-4 h-4" />}
              label="Atualizar Tipo/Recurso"
              onClick={onUpdateCampos}
              isOpen={isOpen}
            />
            <NavItem
              icon={<Database className="w-4 h-4" />}
              label="Forçar Atualização BD"
              onClick={onForceReload}
              isOpen={isOpen}
            />
            <NavItem
              icon={<ClipboardList className="w-4 h-4" />}
              label="Logs do Sistema"
              onClick={onViewLogs}
              isOpen={isOpen}
            />
          </>
        )}

        {/* Demonstrativo */}
        {canViewDashboard && (
          <>
            <SectionHeader label="Relatórios" isOpen={isOpen} />
            <NavItem
              icon={<BarChart3 className="w-4 h-4" />}
              label="Demonstrativo Lote"
              onClick={onDemonstrativoLote}
              isOpen={isOpen}
              variant="accent"
            />
          </>
        )}

        {/* System */}
        <SectionHeader label="Sistema" isOpen={isOpen} />
        <NavItem
          icon={<KeyRound className="w-4 h-4" />}
          label="Trocar Senha"
          onClick={onTrocarSenha}
          isOpen={isOpen}
        />
        <NavItem
          icon={<RefreshCw className="w-4 h-4" />}
          label="Atualizar BD"
          onClick={onAtualizarBD}
          isOpen={isOpen}
        />
      </nav>

      {/* Logout at the bottom */}
      <div className="px-2 py-2 border-t border-white/10">
        <NavItem
          icon={<LogOut className="w-4 h-4" />}
          label="Sair"
          onClick={onLogout}
          isOpen={isOpen}
          variant="danger"
        />
      </div>
    </motion.aside>
  );
}
