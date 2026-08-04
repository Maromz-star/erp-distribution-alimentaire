'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Banniere affichee quand l'appareil perd la connexion internet.
 * Utilise le plugin Capacitor Network, qui fonctionne aussi bien dans
 * l'app native Android / iOS que dans un navigateur web classique grace
 * a son implementation web basee sur navigator.onLine.
 * Si le plugin n'est pas disponible (ex: build sans dependance installee),
 * on retombe sur les evenements navigateur standards.
 */
export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
        let removeListener: (() => void) | undefined;
        let cancelled = false;

                async function init() {
                        try {
                                  const { Network } = await import('@capacitor/network');

                          const status = await Network.getStatus();
                                  if (!cancelled) setIsOffline(!status.connected);

                          const listener = await Network.addListener('networkStatusChange', (s) => {
                                      setIsOffline(!s.connected);
                          });
                                  removeListener = () => listener.remove();
                        } catch {
                                  const updateStatus = () => setIsOffline(!navigator.onLine);
                                  updateStatus();
                                  window.addEventListener('online', updateStatus);
                                  window.addEventListener('offline', updateStatus);
                                  removeListener = () => {
                                              window.removeEventListener('online', updateStatus);
                                              window.removeEventListener('offline', updateStatus);
                                  };
                        }
                }

                init();

                return () => {
                        cancelled = true;
                        removeListener?.();
                };
  }, []);

  if (!isOffline) return null;

  return (
        <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
              <WifiOff size={16} />
              Pas de connexion internet - certaines actions peuvent echouer tant que la connexion n'est pas retablie.
        </div>
      );
}
