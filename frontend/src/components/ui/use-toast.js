'use client';

import { useCallback } from 'react';

// Toast hook for use in components
// Returns a toast function to trigger notifications
export const useToast = () => {
  const toast = useCallback(({ title, description, variant = 'default' }) => {
    // Create a custom event to notify the app about toast
    const event = new CustomEvent('toast', {
      detail: { title, description, variant }
    });
    window.dispatchEvent(event);
  }, []);

  return { toast };
};

// Named export for toast utility
export const toast = ({ title, description, variant = 'default' }) => {
  const event = new CustomEvent('toast', {
    detail: { title, description, variant }
  });
  window.dispatchEvent(event);

  return {
    dismiss: () => {
      const dismissEvent = new CustomEvent('dismissToast');
      window.dispatchEvent(dismissEvent);
    }
  };
};
