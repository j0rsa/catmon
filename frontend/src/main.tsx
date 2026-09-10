import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { DisplaySettingsProvider } from './context/DisplaySettingsProvider';
import { initPwaUpdates } from './lib/pwaUpdate';
import './index.css';

initPwaUpdates();

if ('scrollRestoration' in history) {
  // Browser scroll restoration (especially after service-worker notification
  // navigation) fights React Router + deep-link scrolling and can leave the
  // mobile bottom nav visually detached from the viewport edge on iOS PWAs.
  history.scrollRestoration = 'manual';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DisplaySettingsProvider>
            <App />
          </DisplaySettingsProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
