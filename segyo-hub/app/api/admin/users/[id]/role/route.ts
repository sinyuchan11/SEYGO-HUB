import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const newRole = body?.role
  const allowed = ['pending', 'member', 'moderator', 'admin', 'banned']
  if (!allowed.includes(newRole)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { error } = await supabase.rpc('admin_set_role', {
    target_id: id,
    new_role: newRole,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ ok: true })
}
