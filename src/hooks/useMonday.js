import { useState, useEffect } from 'react';
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
monday.setApiVersion("2024-10");

export function useMonday() {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useMonday: Initializing...');

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('useMonday: Timeout reached, stopping loading');
      setLoading(false);
    }, 5000);

    try {
      monday.listen('context', (res) => {
        console.log('useMonday: Context received from listener', res.data);
        clearTimeout(timeout);
        setContext(res.data);
        setLoading(false);
      });

      monday.get('context').then((res) => {
        console.log('useMonday: Context received from get', res.data);
        clearTimeout(timeout);
        setContext(res.data);
        setLoading(false);
      }).catch((err) => {
        console.error('useMonday: Error getting context:', err);
        clearTimeout(timeout);
        setLoading(false);
      });
    } catch (err) {
      console.error('useMonday: Error initializing:', err);
      clearTimeout(timeout);
      setLoading(false);
    }

    return () => clearTimeout(timeout);
  }, []);

  return { monday, context, loading };
}
