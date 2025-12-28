// Simple toast hook using native browser notifications
// In a production app, you'd use a library like react-hot-toast or sonner

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'success' | 'destructive' | 'default';
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    // For now, using console.log and alert
    // TODO: Replace with proper toast UI component
    const message = options.description
      ? `${options.title}\n${options.description}`
      : options.title;

    if (options.variant === 'destructive') {
      console.error(message);
      // You can use a toast library here
      alert(`Error: ${message}`);
    } else if (options.variant === 'success') {
      console.log(message);
      // You can use a toast library here
      alert(`Success: ${message}`);
    } else {
      console.log(message);
      alert(message);
    }
  };

  return { toast };
}
