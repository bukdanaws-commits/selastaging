// ─── REACT QUERY CLIENT ────────────────────────────────────────────────────
// Centralized QueryClient instance for TanStack React Query

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
