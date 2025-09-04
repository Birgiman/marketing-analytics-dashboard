import { useState, useCallback } from 'react';

export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

interface ToastState {
  toasts: (Toast & { id: string })[];
}

const useToastState = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const addToast = useCallback((toast: Toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    setState(prev => ({
      toasts: [...prev.toasts, { ...toast, id }]
    }));

    // Auto remove after 5 seconds
    setTimeout(() => {
      setState(prev => ({
        toasts: prev.toasts.filter(t => t.id !== id)
      }));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setState(prev => ({
      toasts: prev.toasts.filter(t => t.id !== id)
    }));
  }, []);

  return {
    ...state,
    addToast,
    removeToast
  };
};

let toastState: ReturnType<typeof useToastState> | null = null;

export const useToast = () => {
  if (!toastState) {
    toastState = useToastState();
  }

  return {
    toast: toastState.addToast,
    toasts: toastState.toasts,
    dismiss: toastState.removeToast
  };
};