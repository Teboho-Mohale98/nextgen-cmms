import { QueryClient } from '@tanstack/react-query'

/**
 * Shared QueryClient. Mutations invalidate derived aggregate queries
 * (dashboard KPIs, inventory summary). Live collections bypass the query
 * cache via `useFirestoreLive`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})