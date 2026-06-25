'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InterestsInput } from './InterestsInput'
import {
  MAX_BIO_LEN,
  MAX_TAGLINE_LEN,
  normalizeInterests,
} from '@/lib/profile'

export type ProfileEditInitial = {
  nickname: string | null
  grade_class: string | null
  tagline: string | null
  bio: string | null
  interests: string[]
  avatar_url: string | null
  cover_url: string | null
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_IMAGE = 5 * 1024 * 1024

export function ProfileEditForm({
  userId,
  initial,
}: {
  userId: string
  initial: ProfileEditInitial
}) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initial.nickname ?? '')
  const [gradeClass, setGradeClass] = useState(initial.grade_class ?? '')
  const [tagline, setTagline] = useState(initial.tagline ?? '')
  const [bio, setBio] = useState(initial.bio ?? '')
  const [interests, setInterests] = useState<string[]>(initial.interests)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url)
  const [coverUrl, setCoverUrl] = useState(initial.cover_url)
  const [uploading, setUploading] = useState<null | 'avatar' | 'cover'>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const avatarInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File, kind: 'avatar' | 'cover') {
    setError(null)
    if (!ALLOWED.includes(file.type)) {
      setError('PNG, JPG, GIF, WebP 이미지만 올릴 수 있어요.')
      return
    }
    if (file.size > MAX_IMAGE) {
      setError('이미지는 5MB 이하만 가능해요.')
      return
    }
    setUploading(kind)
    const supabase = createClient()
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${userId}/${kind}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setUploading(null)
      setError('업로드 실패: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
    const url = data.publicUrl
    // Persist the image immediately so it sticks even before pressing 저장.
    const column = kind === 'avatar' ? 'avatar_url' : 'cover_url'
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ [column]: url })
      .eq('id', userId)
    setUploading(null)
    if (dbErr) {
      setError('사진 저장에 실패했어요: ' + dbErr.message)
      return
    }
    if (kind === 'avatar') setAvatarUrl(url)
    else setCoverUrl(url)
    router.refresh()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }
    if (tagline.length > MAX_TAGLINE_LEN) {
      setError(`한줄소개는 ${MAX_TAGLINE_LEN}자 이하로 입력해주세요.`)
      return
    }
    if (bio.length > MAX_BIO_LEN) {
      setError(`소개는 ${MAX_BIO_LEN}자 이하로 입력해주세요.`)
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        grade_class: gradeClass.trim() || null,
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        interests: normalizeInterests(interests),
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      })
      .eq('id', userId)
    setSaving(false)
    if (updErr) {
      if (updErr.code === '23505') setError('이미 사용 중인 닉네임이에요.')
      else setError('저장에 실패했어요: ' + updErr.message)
      return
    }
    router.push('/me')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {/* Cover + avatar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative">
          <div
            className="h-32 bg-primary-100"
            style={
              coverUrl
                ? {
                    backgroundImage: `url("${coverUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            disabled={uploading !== null}
            className="absolute right-2 top-2 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/60 disabled:opacity-50"
          >
            {uploading === 'cover' ? '업로드 중…' : '커버 변경'}
          </button>
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-8 flex items-end gap-3">
            <div className="relative">
              <Avatar name={nickname || '?'} src={avatarUrl} size={64} className="ring-4 ring-surface" />
            </div>
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={uploading !== null}
              className="mb-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {uploading === 'avatar' ? '업로드 중…' : '사진 변경'}
            </button>
          </div>
        </div>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadImage(f, 'avatar')
            e.target.value = ''
          }}
        />
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadImage(f, 'cover')
            e.target.value = ''
          }}
        />
      </div>

      {/* Fields */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <Field label="닉네임">
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="닉네임" />
        </Field>
        <Field label="학년·반">
          <Input value={gradeClass} onChange={(e) => setGradeClass(e.target.value)} maxLength={20} placeholder="예: 2학년 3반" />
        </Field>
        <Field label="한줄소개" hint={`${tagline.length}/${MAX_TAGLINE_LEN}`}>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={MAX_TAGLINE_LEN} placeholder="나를 한 줄로 표현한다면?" />
        </Field>
        <Field label="소개" hint={`${bio.length}/${MAX_BIO_LEN}`}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO_LEN}
            rows={4}
            placeholder="자기소개를 자유롭게 적어보세요."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </Field>
        <Field label="관심사" hint="최대 5개">
          <InterestsInput value={interests} onChange={setInterests} />
        </Field>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={saving || uploading !== null} className="flex-1">
          {saving ? '저장 중…' : '저장'}
        </Button>
        <Link
          href="/me"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-muted px-6 text-sm font-medium text-foreground hover:bg-border"
        >
          취소
        </Link>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-fg">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
