/**
 * Toast notification utilities
 * Wrapper around svelte-5-french-toast for consistent usage
 */
import toast, { Toaster } from 'svelte-5-french-toast';

export { toast, Toaster };

// Convenience functions with consistent styling
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    position: 'bottom-right',
    style: 'word-break: break-word; max-width: 450px;',
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    duration: 3000,
    position: 'bottom-right',
    icon: 'ℹ️',
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'bottom-right',
  });
};

export const dismissToast = (id: string) => {
  toast.dismiss(id);
};
