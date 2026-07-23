import type { createClient } from './supabase/client'

/** Strip HTML tags/entities to plain text (mirrors postPreview excerpt logic). */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Combine a post's title and HTML body into one plain-text string for profanity checking. */
export function buildCheckText(title: string, contentHtml: string): string {
  return [title.trim(), stripHtml(contentHtml)].filter(Boolean).join(' ').trim()
}

/**
 * Ask the server whether the given text contains banned words (contains_profanity RPC).
 * Best-effort for the pre-submit warning only: on any RPC error returns false, since the
 * DB trigger masks authoritatively on insert regardless of what the client does.
 */
export async function checkContainsProfanity(
  supabase: ReturnType<typeof createClient>,
  text: string,
): Promise<boolean> {
  if (!text.trim()) return false
  const { data, error } = await supabase.rpc('contains_profanity', { input: text })
  if (error) return false
  return data === true
}
