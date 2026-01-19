'use client';

import { useCallback } from 'react';

const useToast = () => {
  const toast = useCallback(({ title, description, variant = 'default' }) => {
    // Create a custom event to notify the app about toast
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
  }, []);

  return { toast };
};

export { useToast };
