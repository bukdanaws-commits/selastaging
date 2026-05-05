'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Auto-rehydrate auth session on mount (handles mock auto-login)
  const rehydrateSession = useAuthStore((s) => s.rehydrateSession)
  useEffect(() => {
    rehydrateSession()
  }, [rehydrateSession])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="sheilaon7-theme"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
