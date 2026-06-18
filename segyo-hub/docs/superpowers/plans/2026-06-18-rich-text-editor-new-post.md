# Rich Text Editor — New Post Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain textarea on the "새 글" page with a TipTap rich-text editor, add image upload, anonymous toggle, and board selector, then render sanitized HTML on the post detail page.

**Architecture:** Install TipTap v2 + isomorphic-dompurify. Create `RichEditor` (client component wrapping TipTap), an image upload Route Handler at `/api/upload`, redesign `PostForm` with the new fields, and update `PostDetail` to render sanitized HTML. Content is stored as HTML string in the existing `content text` column — no DB migration needed.

**Tech Stack:** Next.js 16.2.6 (app router), React 19, TipTap v2 (StarterKit + 9 extensions), isomorphic-dompurify, Supabase (client + service), Tailwind v4, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Install | package.json | Add TipTap + dompurify deps |
| Create | `components/post/RichEditor.tsx` | TipTap editor with full toolbar |
| Create | `app/api/upload/route.ts` | Image upload to Supabase Storage |
| Modify | `components/post/PostForm.tsx` | Redesigned form (board, anon, RichEditor) |
| Modify | `app/(app)/post/new/page.tsx` | Restyled server wrapper |
| Modify | `components/post/PostDetail.tsx` | Render sanitized HTML with dangerouslySetInnerHTML |
| Modify | `app/globals.css` | `.post-content` + `.ProseMirror` styles |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-link @tiptap/extension-image @tiptap/extension-text-align @tiptap/extension-placeholder isomorphic-dompurify
```

Expected: All packages install without peer-dependency errors. `package.json` gains new entries under `dependencies`.

- [ ] **Step 2: Verify TipTap installed**

```powershell
ls "C:\sinyuchan\Segyo Hub\segyo-hub\node_modules\@tiptap\react"
```

Expected: Directory exists and contains `package.json`.

- [ ] **Step 3: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add package.json package-lock.json
git commit -m "chore: install tiptap v2 and isomorphic-dompurify"
```

---

## Task 2: Add content styles to globals.css

**Files:**
- Modify: `app/globals.css`

These styles are needed by the RichEditor (`.ProseMirror`) and PostDetail (`.post-content`). Adding them first means the editor looks right as soon as it's wired up.

- [ ] **Step 1: Append content styles**

Open `app/globals.css` and append the following block at the end of the file (after the `body {}` block):

```css
/* ── Rich text content styles (editor surface + post detail) ─────── */
.post-content,
.ProseMirror {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-foreground);
  outline: none;
}

.post-content h1,
.ProseMirror h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  line-height: 1.25;
}

.post-content h2,
.ProseMirror h2 {
  font-size: 1.375rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.4rem;
  line-height: 1.3;
}

.post-content h3,
.ProseMirror h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.35rem;
  line-height: 1.35;
}

.post-content p,
.ProseMirror p {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.post-content ul,
.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.post-content ol,
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.post-content li,
.ProseMirror li {
  margin-bottom: 0.25rem;
}

.post-content blockquote,
.ProseMirror blockquote {
  border-left: 3px solid var(--color-primary-600);
  color: var(--color-muted-fg);
  font-style: italic;
  padding: 0.5rem 1rem;
  margin: 0.75rem 0;
  background: var(--color-primary-50);
  border-radius: 0 6px 6px 0;
}

.post-content code,
.ProseMirror code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  background: var(--color-muted);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

.post-content pre,
.ProseMirror pre {
  background: var(--color-foreground);
  color: #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875rem;
}

.post-content pre code,
.ProseMirror pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
}

.post-content a,
.ProseMirror a {
  color: var(--color-primary-600);
  text-decoration: underline;
}

.post-content img,
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.post-content strong,
.ProseMirror strong {
  font-weight: 700;
}

.post-content em,
.ProseMirror em {
  font-style: italic;
}

.post-content mark,
.ProseMirror mark {
  background: #fde68a;
  padding: 0.05em 0.2em;
  border-radius: 2px;
}

/* TipTap placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--color-muted-fg);
  float: left;
  height: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add app/globals.css
git commit -m "feat(post): add post-content and ProseMirror content styles"
```

---

## Task 3: Create the RichEditor component

**Files:**
- Create: `components/post/RichEditor.tsx`

**Key TipTap notes:**
- `useEditor` option `immediatelyRender: false` is required to suppress SSR hydration mismatch in Next.js.
- `editor.getHTML()` returns the serialized HTML string.
- `editor.isActive(name, attrs?)` checks toolbar active state.
- Image upload calls `/api/upload` (POST multipart/form-data with field `file`), expects `{ url: string }` back.
- Use a hidden `<input type="file">` ref for the image picker, triggered by a toolbar button click.
- No external icon library — use inline SVG or plain text/unicode labels for toolbar buttons.

- [ ] **Step 1: Create the file**

Create `components/post/RichEditor.tsx` with this content:

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useRef } from 'react'
import { cn } from '@/lib/cn'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

export function RichEditor({ value, onChange }: RichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: '내용을 입력하세요' }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  function setLink() {
    const url = prompt('링크 URL을 입력하세요')
    if (url) {
      editor!.chain().focus().setLink({ href: url }).run()
    }
  }

  function unsetLink() {
    editor!.chain().focus().unsetLink().run()
  }

  async function handleImageFile(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) {
      alert('이미지 업로드에 실패했습니다.')
      return
    }
    const { url } = await res.json()
    editor!.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-canvas px-2 py-1.5 sticky top-0 z-10">
        {/* Format */}
        <ToolbarButton
          title="굵게 (B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="기울임 (I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="밑줄 (U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolbarButton>
        <ToolbarButton
          title="취소선 (S)"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Headings */}
        <ToolbarButton
          title="제목 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="제목 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="제목 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Lists */}
        <ToolbarButton
          title="글머리 목록"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          title="번호 목록"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1≡
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Quote / Code */}
        <ToolbarButton
          title="인용구"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="코드 블록"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {'</>'}
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Color */}
        <label
          title="글자색"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm hover:bg-muted"
        >
          <span className="font-bold" style={{ color: editor.getAttributes('textStyle').color ?? 'currentColor' }}>A</span>
          <input
            type="color"
            className="sr-only"
            onInput={(e) =>
              editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()
            }
          />
        </label>

        {/* Highlight */}
        <ToolbarButton
          title="형광펜"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <span style={{ background: '#fde68a', padding: '0 2px' }}>H</span>
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Link */}
        <ToolbarButton
          title="링크 추가"
          active={editor.isActive('link')}
          onClick={setLink}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          title="링크 해제"
          active={false}
          onClick={unsetLink}
        >
          ✂️
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Align */}
        <ToolbarButton
          title="왼쪽 정렬"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          ⬅
        </ToolbarButton>
        <ToolbarButton
          title="가운데 정렬"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          ↔
        </ToolbarButton>
        <ToolbarButton
          title="오른쪽 정렬"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          ➡
        </ToolbarButton>

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Image */}
        <ToolbarButton
          title="이미지 업로드"
          active={false}
          onClick={() => imageInputRef.current?.click()}
        >
          🖼
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
            e.target.value = ''
          }}
        />

        <span className="mx-1 w-px self-stretch bg-border" />

        {/* Undo / Redo */}
        <ToolbarButton
          title="실행 취소"
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="다시 실행"
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor surface */}
      <EditorContent
        editor={editor}
        className="min-h-[320px] px-4 py-3"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add components/post/RichEditor.tsx
git commit -m "feat(post): add RichEditor component with TipTap and full toolbar"
```

---

## Task 4: Create the image upload Route Handler

**Files:**
- Create: `app/api/upload/route.ts`

This is a POST-only route. It uses the **server** Supabase client (for auth) and the **service** client (to bypass Storage RLS). The `post-images` bucket is already public and exists in Supabase.

- [ ] **Step 1: Create the file**

Create `app/api/upload/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Role check: member+ only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role === 'pending' || profile.role === 'banned') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // 4. Validate type + size
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPEG, GIF, or WebP.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 5 MB.' },
      { status: 400 },
    )
  }

  // 5. Upload via service client
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const random = Math.random().toString(36).slice(2, 8)
  const path = `${user.id}/${Date.now()}-${random}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const svc = createServiceClient()
  const { error: uploadError } = await svc.storage
    .from('post-images')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 6. Return public URL
  const { data: urlData } = svc.storage.from('post-images').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
```

- [ ] **Step 2: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add app/api/upload/route.ts
git commit -m "feat(api): add image upload route handler for post-images bucket"
```

---

## Task 5: Redesign PostForm

**Files:**
- Modify: `components/post/PostForm.tsx`

New fields: board selector (free/qna, + notice if moderator/admin), anonymous toggle, RichEditor for body. Validation strips HTML tags before checking emptiness. Insert includes `board` and `is_anonymous`.

- [ ] **Step 1: Replace PostForm.tsx entirely**

Replace the entire contents of `components/post/PostForm.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canModerate, type UserRole } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { RichEditor } from '@/components/post/RichEditor'

type BoardKind = 'free' | 'qna' | 'notice'

const BOARD_OPTIONS: { value: BoardKind; label: string }[] = [
  { value: 'free', label: '자유게시판' },
  { value: 'qna', label: '질문' },
]

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function PostForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [board, setBoard] = useState<BoardKind>('free')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  // Fetch current user role to conditionally show 공지 option
  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('role, timeout_until')
        .eq('id', user.id)
        .single()
      if (data) setUserRole(data.role as UserRole)
    }
    fetchRole()
  }, [])

  const boardOptions =
    userRole && canModerate({ role: userRole, timeout_until: null })
      ? [...BOARD_OPTIONS, { value: 'notice' as BoardKind, label: '공지' }]
      : BOARD_OPTIONS

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length === 0 || stripHtml(content).length === 0) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        board,
        title: title.trim(),
        content,
        is_anonymous: isAnonymous,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/post/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <input
          type="text"
          required
          maxLength={100}
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-0 border-b border-border bg-transparent pb-2 text-xl font-bold placeholder-muted-fg focus:border-primary-600 focus:outline-none transition-colors"
        />
      </div>

      {/* Board + Anonymous row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Board selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-fg">게시판</span>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {boardOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBoard(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  board === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface text-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anonymous toggle */}
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <div
              className={cn(
                'h-5 w-9 rounded-full transition-colors',
                isAnonymous ? 'bg-primary-600' : 'bg-border',
              )}
            />
            <div
              className={cn(
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                isAnonymous && 'translate-x-4',
              )}
            />
          </div>
          <span className="text-sm font-medium text-muted-fg">익명으로 작성</span>
        </label>
      </div>

      {/* Rich editor */}
      <RichEditor value={content} onChange={setContent} />

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={loading} className="min-w-[120px]">
          {loading ? '등록 중...' : '등록'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add components/post/PostForm.tsx
git commit -m "feat(post): redesign PostForm with board selector, anonymous toggle, and RichEditor"
```

---

## Task 6: Redesign the new post page wrapper

**Files:**
- Modify: `app/(app)/post/new/page.tsx`

This stays a server component. Update it to a centered card layout.

- [ ] **Step 1: Replace page.tsx**

Replace the entire contents of `app/(app)/post/new/page.tsx` with:

```tsx
import { PostForm } from '@/components/post/PostForm'

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-foreground">새 글</h1>
        <div className="rounded-2xl border border-border bg-surface shadow-sm px-6 py-6">
          <PostForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add "app/(app)/post/new/page.tsx"
git commit -m "feat(post): redesign new post page with centered card layout"
```

---

## Task 7: Render sanitized HTML in PostDetail

**Files:**
- Modify: `components/post/PostDetail.tsx` (line 72)

Replace the plain `<p>` content render with a DOMPurify-sanitized `dangerouslySetInnerHTML`. Old plain-text posts (no HTML tags) still render correctly because DOMPurify is a no-op on plain text.

- [ ] **Step 1: Add DOMPurify import**

In `components/post/PostDetail.tsx`, add this import at the top (after the existing imports):

```tsx
import DOMPurify from 'isomorphic-dompurify'
```

- [ ] **Step 2: Replace the plain content render**

Find line 72:
```tsx
        <p className="mt-3 whitespace-pre-wrap">{data.content}</p>
```

Replace it with:
```tsx
        <div
          className="post-content mt-3"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } }) }}
        />
```

- [ ] **Step 3: Commit**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add components/post/PostDetail.tsx
git commit -m "feat(post): render sanitized HTML in PostDetail using DOMPurify"
```

---

## Task 8: Build verification

- [ ] **Step 1: Run production build**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
npm run build 2>&1 | Select-Object -Last 40
```

Expected: Build completes with `✓ Compiled successfully` or `Route (app) ...` output listing all routes. No TypeScript errors. The `/post/new` route and `/api/upload` route must appear in the output.

If the build fails:
- TypeScript errors in `RichEditor.tsx`: check that `@tiptap/react` exports `useEditor` and `EditorContent` — inspect `node_modules/@tiptap/react/dist/index.d.ts`.
- Import errors for `isomorphic-dompurify`: it has a default export `DOMPurify`; the import `import DOMPurify from 'isomorphic-dompurify'` is correct.
- If `server-only` triggers in service client from a route handler: that is expected — route handlers run server-side.

- [ ] **Step 2: Check dev server returns 200 for /post/new**

```powershell
curl -s -o NUL -w "%{http_code}" http://localhost:3000/post/new
```

Expected output: `200`

- [ ] **Step 3: Final commit (if any lingering fixes were needed)**

```powershell
cd "C:\sinyuchan\Segyo Hub\segyo-hub"
git add -A
git status
# Only commit if there are changes not yet committed
```

---

## Self-Review Against Spec

### Spec coverage check

| Requirement | Task |
|-------------|------|
| Install TipTap deps + dompurify | Task 1 |
| RichEditor with StarterKit + 9 extensions | Task 3 |
| `immediatelyRender: false` for SSR | Task 3 (in `useEditor` options) |
| Toolbar: bold/italic/underline/strike | Task 3 |
| Toolbar: H1/H2/H3 | Task 3 |
| Toolbar: bullet/ordered list | Task 3 |
| Toolbar: blockquote/codeblock | Task 3 |
| Toolbar: color input | Task 3 |
| Toolbar: highlight | Task 3 |
| Toolbar: link set/unset | Task 3 |
| Toolbar: text align L/C/R | Task 3 |
| Toolbar: image upload via /api/upload | Task 3 |
| Toolbar: undo/redo | Task 3 |
| Active state on toolbar buttons | Task 3 (`editor.isActive(...)`) |
| Sticky toolbar | Task 3 (`sticky top-0`) |
| Image upload route handler (POST /api/upload) | Task 4 |
| Auth + role check in upload route | Task 4 |
| Validate mime + 5 MB size | Task 4 |
| Upload to `post-images` via service client | Task 4 |
| Return public URL | Task 4 |
| PostForm: large borderless title input | Task 5 |
| PostForm: board selector (free/qna/notice) | Task 5 |
| PostForm: notice only for mod/admin | Task 5 |
| PostForm: anonymous toggle | Task 5 |
| PostForm: RichEditor for body | Task 5 |
| Validation: title + strip-HTML content check | Task 5 |
| Insert with board + is_anonymous + HTML content | Task 5 |
| New post page: centered card, max-w-3xl | Task 6 |
| PostDetail: sanitized dangerouslySetInnerHTML | Task 7 |
| `.post-content` + `.ProseMirror` CSS styles | Task 2 |
| Build must pass | Task 8 |
| curl 200 check | Task 8 |

All requirements covered. No gaps found.

### Placeholder scan

No TBD, TODO, or vague steps. All code blocks contain complete, runnable code.

### Type consistency

- `BoardKind = 'free' | 'qna' | 'notice'` — defined once in PostForm, used consistently.
- `canModerate({ role, timeout_until })` — matches `ProfileLike` type from `lib/permissions.ts` (fields `role` + `timeout_until`).
- `RichEditorProps { value: string, onChange: (html: string) => void }` — consistent with PostForm usage `<RichEditor value={content} onChange={setContent} />`.
- `editor.chain().focus().setColor(value).run()` — correct TipTap Color extension API.
- `editor.chain().focus().setImage({ src: url }).run()` — correct TipTap Image extension API.
- `DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } })` — correct isomorphic-dompurify API (default export).
