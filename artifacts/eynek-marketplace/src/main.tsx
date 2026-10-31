import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const vtoOrigin = ((import.meta.env.VITE_EYNEK_VTO_ORIGIN as string | undefined) || 'https://tryon-wa.onrender.com').replace(/\/$/, '');
const vtoStore = (import.meta.env.VITE_EYNEK_VTO_STORE as string | undefined) || 'eynek-store';
const vtoScript = document.createElement('script');
vtoScript.src = `${vtoOrigin}/sdk/eynek-vto.js`;
vtoScript.async = true;
vtoScript.dataset.store = vtoStore;
document.body.appendChild(vtoScript);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
