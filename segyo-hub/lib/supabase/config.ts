export const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
export const PLACEHOLDER_ANON_KEY = 'placeholder-anon-key'
export const PLACEHOLDER_SERVICE_KEY = 'placeholder-service-role-key'

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
