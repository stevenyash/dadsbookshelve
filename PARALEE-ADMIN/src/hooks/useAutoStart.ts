import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../lib/store';

export function useAutoStart() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAutoStart = useCallback(async () => {
    try {
      const enabled = await invoke<boolean>('is_auto_start_enabled');
      setIsEnabled(enabled);
      return enabled;
    } catch (err) {
      console.error('Check auto-start error:', err);
      return false;
    }
  }, []);

  const enableAutoStart = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<boolean>('enable_auto_start');
      setIsEnabled(true);
      return result;
    } catch (err) {
      console.error('Enable auto-start error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disableAutoStart = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<boolean>('disable_auto_start');
      setIsEnabled(false);
      return result;
    } catch (err) {
      console.error('Disable auto-start error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleAutoStart = useCallback(async () => {
    if (isEnabled) {
      return disableAutoStart();
    } else {
      return enableAutoStart();
    }
  }, [isEnabled, enableAutoStart, disableAutoStart]);

  return {
    isEnabled,
    isLoading,
    checkAutoStart,
    enableAutoStart,
    disableAutoStart,
    toggleAutoStart,
  };
}