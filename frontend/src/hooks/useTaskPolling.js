import { useEffect, useRef } from 'react';

/**
 * useTaskPolling
 *
 * Polls a callback function every `interval` ms.
 * Pauses automatically when the browser tab is not focused.
 * Resumes and fires immediately when the tab becomes visible again.
 *
 * @param {Function} callback - async function to call on each poll
 * @param {number} interval   - polling interval in ms (default 30000)
 * @param {boolean} enabled   - set to false to disable polling
 */
const useTaskPolling = (callback, interval = 30000, enabled = true) => {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  // Always use the latest callback without restarting the timer
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const startPolling = () => {
      timerRef.current = setInterval(() => {
        // Only poll when tab is visible
        if (document.visibilityState === 'visible') {
          callbackRef.current();
        }
      }, interval);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became active — fire immediately then restart timer
        callbackRef.current();
        stopPolling();
        startPolling();
      } else {
        // Tab hidden — stop polling to save resources
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, enabled]);
};

export default useTaskPolling;
