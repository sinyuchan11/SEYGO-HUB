import type { MentionMember } from './mentions'

type SupabaseLike = {
  from: (table: string) => any
}

/**
 * Members that can be mentioned. Small community, so the whole list is fetched
 * once per page and handed to the client for autocomplete and for rendering
 * existing mentions as profile links.
 */
export async function fetchMentionMembers(supabase: SupabaseLike): Promise<MentionMember[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, nickname')
    .not('nickname', 'is', null)
    .in('role', ['member', 'moderator', 'admin'])
    .order('nickname')

  return (data ?? []) as MentionMember[]
}
