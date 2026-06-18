'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useRef, useState } from 'react'
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
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  // Open an inline URL editor (window.prompt is not supported in this runtime).
  function openLinkEditor() {
    const prev = editor!.getAttributes('link').href as string | undefined
    setLinkUrl(prev ?? '')
    setLinkOpen(true)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (!url) {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
      editor!.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
    setLinkUrl('')
  }

  function unsetLink() {
    editor!.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  async function handleImageFile(file: File) {
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setUploadError(body?.error ?? '이미지 업로드에 실패했습니다.')
        return
      }
      const { url } = await res.json()
      editor!.chain().focus().setImage({ src: url }).run()
    } catch {
      setUploadError('이미지 업로드 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-0.5 border-b border-border bg-canvas px-2 py-1.5">
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
          <span
            className="font-bold"
            style={{
              color:
                (editor.getAttributes('textStyle').color as string | undefined) ??
                'currentColor',
            }}
          >
            A
          </span>
          <input
            type="color"
            className="sr-only"
            onInput={(e) =>
              editor
                .chain()
                .focus()
                .setColor((e.target as HTMLInputElement).value)
                .run()
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
          onClick={openLinkEditor}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton title="링크 해제" active={false} onClick={unsetLink}>
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

      {/* Inline link editor (replaces window.prompt) */}
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-2 py-1.5">
          <input
            autoFocus
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              } else if (e.key === 'Escape') {
                setLinkOpen(false)
              }
            }}
            className="h-7 flex-1 rounded border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="button"
            onClick={applyLink}
            className="h-7 rounded bg-primary-600 px-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-7 rounded px-2.5 text-sm text-foreground hover:bg-muted"
          >
            취소
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="border-b border-border bg-danger/10 px-3 py-1.5 text-sm text-danger">
          {uploadError}
        </p>
      )}

      {/* Editor surface */}
      <EditorContent editor={editor} className="min-h-[320px] px-4 py-3" />
    </div>
  )
}
