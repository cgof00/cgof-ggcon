/**
 * AppLayout.tsx
 * Layout wrapper modernizado para o App
 * Mantém toda a lógica do App.tsx intacta
 * Apenas refatora a estrutura visual
 */

import React, { ReactNode } from 'react';
import { Header, HeaderUser } from './Header';

interface AppLayoutProps {
  logo?: string;
  title: string;
  user?: HeaderUser;
  onLogout?: () => void;
  navItems?: Array<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon?: ReactNode;
  }>;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function AppLayout({
  logo,
  title,
  user,
  onLogout,
  navItems,
  headerActions,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-tertiary">
      {/* Header with navigation */}
      <Header
        logo={logo}
        title={title}
        user={user}
        onLogout={onLogout}
        navItems={navItems}
        rightContent={headerActions}
      />

      {/* Main content area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>

      {/* Optional Footer */}
      <footer className="bg-surface-secondary border-t border-primary text-center py-4 text-secondary text-xs mt-auto">
        <p>© 2026 Sistema de Gestão de Emendas e Convênios. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
