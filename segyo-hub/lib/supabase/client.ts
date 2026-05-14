import { createBrowserClient } from '@supabase/ssr'

// Safe placeholders so that module load never throws when env vars are missing.
// Real Supabase calls will fail at network time, which is the responsibility of callers.
const PLACEHOLDER_URL = 'http://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  )
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
