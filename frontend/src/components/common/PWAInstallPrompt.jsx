import { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="alert bg-primary text-primary-content shadow-xl rounded-2xl">
        <FiDownload size={22} className="shrink-0" />
        <div>
          <p className="font-bold text-sm">Install OA Attend</p>
          <p className="text-xs opacity-80">Add to home screen for quick access</p>
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="btn btn-sm btn-ghost text-primary-content" onClick={dismiss}>
            <FiX />
          </button>
          <button className="btn btn-sm bg-white text-primary" onClick={install}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
