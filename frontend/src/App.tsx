import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import InPageNotificationProvider from './components/notifications/InPageNotificationProvider';
import { AppProviders } from './components/providers/AppProviders';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <InPageNotificationProvider>
          <AppRouter />
        </InPageNotificationProvider>
      </AppProviders>
    </QueryClientProvider>
  );
}

export default App;
