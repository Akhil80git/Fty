import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Site Opener PWA update available.');
  },
  onOfflineReady() {
    console.log('Site Opener PWA is offline-ready.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
