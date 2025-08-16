import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User as UserIcon, X, LogOut, Shield, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AccountInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountInfoModal({ isOpen, onClose }: AccountInfoModalProps) {
  const { user, profile, logout } = useAuth();
  const displayName = profile?.displayName || user?.email || '—';
  const role = String(profile?.role || 'unknown');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Konto</h1>
                  <p className="text-sm text-gray-600">Angemeldet als {displayName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors" aria-label="Schließen">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Rolle</div>
                <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-800 rounded">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">{role}</span>
                </div>
              </div>
              {role === 'admin' && (
                <div>
                  <button
                    onClick={() => {
                      // CustomEvent, um das Admin-Modal aus App.tsx zu öffnen
                      window.dispatchEvent(new CustomEvent('open-admin-modal'));
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Users className="w-4 h-4" /> Benutzerverwaltung
                  </button>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={async () => { await logout(); onClose(); }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" /> Abmelden
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AccountInfoModal;


