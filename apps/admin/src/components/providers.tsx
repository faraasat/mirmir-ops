'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api';

// Component to sync session token with API client
function ApiTokenSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const previousToken = useRef<string | null>(null);

  useEffect(() => {
    // Set the backend JWT token in the admin API client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken || null;
    
    if (accessToken !== previousToken.current) {
      adminApi.setToken(accessToken);
      previousToken.current = accessToken;
      
      // If we just got a token, invalidate queries to refetch with new auth
      if (accessToken && status === 'authenticated') {
        queryClient.invalidateQueries();
      }
      
      // If logged out, clear the token
      if (!accessToken && status === 'unauthenticated') {
        adminApi.setToken(null);
      }
    }
  }, [session, status, queryClient]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ApiTokenSync>{children}</ApiTokenSync>
      </QueryClientProvider>
    </SessionProvider>
  );
}
