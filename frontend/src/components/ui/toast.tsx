import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from '../../lib/toast';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const getToastIcon = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-success-600" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-danger-600" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning-600" />;
    case 'info':
      return <Info className="h-5 w-5 text-primary-600" />;
    default:
      return <Info className="h-5 w-5 text-neutral-500" />;
  }
};

const getToastAccent = (type: Toast['type']) => {
  switch (type) {
    case 'success': return 'border-l-4 border-l-success-500';
    case 'error':   return 'border-l-4 border-l-danger-500';
    case 'warning': return 'border-l-4 border-l-warning-500';
    case 'info':    return 'border-l-4 border-l-primary-500';
    default:        return 'border-l-4 border-l-neutral-400';
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast: toastItem,
  onRemove,
}) => {
  return (
    <div
      className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto border border-neutral-200/80 overflow-hidden transition-all duration-300 ease-in-out ${getToastAccent(toastItem.type)}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getToastIcon(toastItem.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900">{toastItem.message}</p>
          </div>
          <button
            className="flex-shrink-0 rounded-md p-0.5 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-colors duration-150 cursor-pointer"
            onClick={() => onRemove(toastItem.id)}
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-[100]"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map(toastItem => (
          <ToastItem key={toastItem.id} toast={toastItem} onRemove={toast.remove.bind(toast)} />
        ))}
      </div>
    </div>
  );
};
