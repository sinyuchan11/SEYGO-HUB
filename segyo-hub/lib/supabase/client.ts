import { createBrowserClient } from '@supabase/ssr'
import { PLACEHOLDER_ANON_KEY, PLACEHOLDER_URL } from './config'

// Safe placeholders so that module load never throws when env vars are missing.
// Real Supabase calls will fail at network time, which is the responsibility of callers.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY,
  )
}
