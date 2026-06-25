import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

type Notif = {
  id: number
  kind: 'comment_on_post' | 'reply_on_comment'
  payload: { post_id: number; comment_id: number; parent_comment_id?: number; actor_id: string }
  read_at: string | null
  created_at: string
}

function KindIcon({ kind }: { kind: Notif['kind'] }) {
  if (kind === 'reply_on_comment') {
    return (
      <span aria-hidden="true" className="flex-shrink-0 text-lg leading-none">
        ↩️
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="flex-shrink-0 text-lg leading-none">
      💬
    </span>
  )
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  const items: Notif[] = (data as Notif[]) ?? []

  return (
    <div className="space-y-4 px-3 py-2 pb-24 md:pb-8">
      <h1 className="text-lg font-bold text-foreground">알림</h1>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-3xl">🔔</span>
          <p className="text-sm font-medium text-foreground">새 알림이 없어요</p>
          <p className="text-xs text-muted-fg">댓글이나 답글이 달리면 여기에 표시돼요.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {items.map((n) => {
            const postId = n.payload?.post_id
            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 px-4 py-4 transition-colors',
                  n.read_at === null ? 'bg-primary-50' : 'bg-surface',
                )}
              >
                <KindIcon kind={n.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {n.kind === 'comment_on_post'
                      ? '내 글에 새 댓글이 달렸어요'
                      : '내 댓글에 답글이 달렸어요'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-fg" suppressHydrationWarning>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {n.read_at === null && (
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-600" />
                )}
              </div>
            )

            return (
              <div key={n.id}>
                {postId ? (
                  <Link
                    href={`/post/${postId}`}
                    className="block hover:bg-muted"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
