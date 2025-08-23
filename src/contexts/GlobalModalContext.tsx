import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalConfig {
  id: string;
  component: ReactNode;
  onClose?: () => void;
}

interface GlobalModalContextType {
  openModal: (config: ModalConfig) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

export const useGlobalModal = () => {
  const context = useContext(GlobalModalContext);
  if (!context) {
    throw new Error('useGlobalModal must be used within a GlobalModalProvider');
  }
  return context;
};

interface GlobalModalProviderProps {
  children: ReactNode;
}

export const GlobalModalProvider: React.FC<GlobalModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const openModal = (config: ModalConfig) => {
    setModals(prev => [...prev, config]);
  };

  const closeModal = (id: string) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return prev.filter(m => m.id !== id);
    });
  };

  const closeAllModals = () => {
    modals.forEach(modal => {
      if (modal.onClose) {
        modal.onClose();
      }
    });
    setModals([]);
  };

  const contextValue: GlobalModalContextType = {
    openModal,
    closeModal,
    closeAllModals,
  };

  return (
    <GlobalModalContext.Provider value={contextValue}>
      {children}
      {/* Render modals using portal at the end of body */}
      {typeof window !== 'undefined' && modals.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            {modals.map((modal, index) => (
              <div
                key={modal.id}
                className="absolute inset-0"
                style={{ zIndex: 9999 + index }}
              >
                {modal.component}
              </div>
            ))}
          </div>,
          document.body
        )
      }
    </GlobalModalContext.Provider>
  );
};

export default GlobalModalContext;
