import React, { ReactNode } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { Button } from './Button';

export interface HeaderUser {
  nome: string;
  role: 'admin' | 'intermediario' | 'usuario';
  email?: string;
}

interface HeaderProps {
  logo?: string;
  title: string;
  user?: HeaderUser;
  onLogout?: () => void;
  rightContent?: ReactNode;
  navItems?: Array<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon?: ReactNode;
  }>;
}

const getRoleName = (role: string) => {
  const roleName: Record<string, string> = {
    admin: 'Administrador',
    intermediario: 'Intermediário',
    usuario: 'Usuário',
  };
  return roleName[role] || role;
};

export function Header({
  logo,
  title,
  user,
  onLogout,
  rightContent,
  navItems,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-surface-primary border-b-2 border-primary shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 min-w-0">
            {logo && (
              <img
                src={logo}
                alt="Logo"
                className="h-10 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <h1 className="text-lg sm:text-xl font-bold text-inverse truncate">
              {title}
            </h1>
          </div>

          {/* Navigation Tabs */}
          {navItems && navItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-primary flex-shrink-0">
              {navItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="px-4 py-1.5 rounded-md text-sm font-bold transition-normal flex items-center gap-2"
                  style={
                    item.isActive
                      ? {
                          backgroundColor: '#AE1E25',
                          color: 'white',
                        }
                      : {
                          color: 'white',
                        }
                  }
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* Spacer */}
          {(rightContent || user) && <div className="h-8 w-px bg-primary hidden md:block" />}

          {/* Right Content */}
          {rightContent && <div className="flex-shrink-0 hidden md:block">{rightContent}</div>}

          {/* User Section */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-primary flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-inverse">{user.nome}</p>
                <p className="text-xs text-secondary flex items-center justify-end gap-1">
                  <Shield className="w-3 h-3" />
                  {getRoleName(user.role)}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-md transition-normal text-primary hover:text-inverse hover:bg-primary"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
