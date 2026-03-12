import { toast as toastManager } from '../lib/toast';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'success' | 'destructive' | 'default';
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const message = options.description
      ? `${options.title}: ${options.description}`
      : options.title;

    if (options.variant === 'destructive') {
      toastManager.error(message, options.duration);
    } else if (options.variant === 'success') {
      toastManager.success(message, options.duration);
    } else {
      toastManager.info(message, options.duration);
    }
  };

  return { toast };
}
