import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const PLACEHOLDER_URL = 'http://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-service-role-key'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY,
    { auth: { persistSession: false } },
  )
}
