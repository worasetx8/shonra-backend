import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'alert' | 'confirm';
  variant?: 'default' | 'danger' | 'success';
}

interface DialogContextType {
  showAlert: (message: string, options?: Omit<DialogOptions, 'message' | 'type'>) => Promise<void>;
  showConfirm: (message: string, options?: Omit<DialogOptions, 'message' | 'type'>) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DialogOptions>({ message: '' });
  const [resolveRef, setResolveRef] = useState<((value: any) => void) | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(false);
      setResolveRef(null);
    }
  }, [resolveRef]);

  const confirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(true);
      setResolveRef(null);
    }
  }, [resolveRef]);

  const showAlert = useCallback((message: string, options: Omit<DialogOptions, 'message' | 'type'> = {}) => {
    return new Promise<void>((resolve) => {
      setConfig({
        message,
        type: 'alert',
        title: 'System Alert',
        confirmText: 'OK',
        ...options
      });
      setResolveRef(() => () => resolve());
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((message: string, options: Omit<DialogOptions, 'message' | 'type'> = {}) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        message,
        type: 'confirm',
        title: 'Confirm Action',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        ...options
      });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={config.type === 'alert' ? confirm : close}
        title={config.title || 'Notification'}
        footer={
          <>
            {config.type === 'confirm' && (
              <button
                onClick={close}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {config.cancelText || 'Cancel'}
              </button>
            )}
            <button
              onClick={confirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                config.variant === 'danger' 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {config.confirmText || 'OK'}
            </button>
          </>
        }
      >
        <p>{config.message}</p>
      </Modal>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

