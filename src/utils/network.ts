import { useState, useEffect } from 'react';

// Key for manual offline simulation toggle
const SIMULATED_OFFLINE_KEY = 'bowmaster_simulated_offline';

export function isDeviceOnline(): boolean {
  const simulated = localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  if (simulated) return false;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function setSimulatedOffline(offline: boolean) {
  localStorage.setItem(SIMULATED_OFFLINE_KEY, String(offline));
  window.dispatchEvent(new Event('network_status_change'));
}

export function isSimulatedOffline(): boolean {
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());
  const [simulated, setSimulated] = useState<boolean>(isSimulatedOffline());

  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(isDeviceOnline());
      setSimulated(isSimulatedOffline());
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    window.addEventListener('network_status_change', handleStatus);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('network_status_change', handleStatus);
    };
  }, []);

  const toggleSimulatedOffline = () => {
    const next = !simulated;
    setSimulatedOffline(next);
  };

  return { isOnline, simulated, toggleSimulatedOffline };
}
