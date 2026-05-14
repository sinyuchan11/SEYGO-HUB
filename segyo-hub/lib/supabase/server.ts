import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PLACEHOLDER_ANON_KEY, PLACEHOLDER_URL } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — set() is a no-op there, ignore.
          }
        },
      },
    },
  )
}
