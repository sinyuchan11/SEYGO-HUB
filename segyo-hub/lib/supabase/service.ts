import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { PLACEHOLDER_SERVICE_KEY, PLACEHOLDER_URL } from './config'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_SERVICE_KEY,
    { auth: { persistSession: false } },
  )
}
