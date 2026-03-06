import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onClear?: () => void;
  title?: string;
  children: ReactNode;
}

export function FilterPanel({
  isOpen,
  onClose,
  onApply,
  onClear,
  title = 'Filtros Avançados',
  children,
}: FilterPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Panel */}
      <motion.div
        className="fixed inset-0 z-30 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            className="bg-surface-tertiary border-2 border-primary rounded-xl shadow-xl w-full max-w-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-primary">
              <h3 className="text-lg font-bold text-primary">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-md transition-normal text-primary hover:bg-state-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end p-6 border-t border-primary">
              {onClear && (
                <Button variant="outline" onClick={onClear} size="md">
                  Limpar Filtros
                </Button>
              )}
              {onApply && (
                <Button variant="primary" onClick={onApply} size="md">
                  Aplicar Filtros
                </Button>
              )}
              <Button variant="secondary" onClick={onClose} size="md">
                Fechar
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
