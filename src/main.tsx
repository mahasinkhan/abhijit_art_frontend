import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles.css'
import App from './App'

/**
 * One shared query cache for the whole app. Defaults tuned for an admin panel:
 *   • staleTime 30s   — data counts as fresh for 30s, so flipping between tabs
 *                       doesn't fire a refetch storm; it serves from cache.
 *   • gcTime 5 min    — a screen's data stays cached 5 min after it unmounts,
 *                       so going back to it is instant (no spinner, no refetch).
 *   • retry 1         — one automatic retry on a failed request, then it errors.
 *   • no focus refetch — don't re-hit the API just because the window regained
 *                        focus (annoying + wasteful for an internal tool).
 * A mutation (create/update/delete) invalidates the relevant queryKey so the
 * affected lists refetch once, on demand — that's how writes stay in sync.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)