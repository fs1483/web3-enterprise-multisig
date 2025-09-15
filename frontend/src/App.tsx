import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import InPageNotificationProvider from './components/notifications/InPageNotificationProvider';
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
      <InPageNotificationProvider>
        <AppRouter />
      </InPageNotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
