import { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export function useToast() {
  const valor = useContext(ToastContext);
  if (!valor) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return valor;
}
