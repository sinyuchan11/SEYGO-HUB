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

/** Shared 24x24 stroke-icon wrapper (currentColor). */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Toolbar icons (lucide-style paths; no icon dependency installed)
const IconBold = () => <Svg><path d="M6 12h9a4 4 0 0 1 0 8H6z" /><path d="M6 4h8a4 4 0 0 1 0 8H6z" /></Svg>
const IconItalic = () => <Svg><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></Svg>
const IconUnderline = () => <Svg><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" x2="20" y1="20" y2="20" /></Svg>
const IconStrike = () => <Svg><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" x2="20" y1="12" y2="12" /></Svg>
const IconList = () => <Svg><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></Svg>
const IconOrderedList = () => <Svg><line x1="10" x2="21" y1="6" y2="6" /><line x1="10" x2="21" y1="12" y2="12" /><line x1="10" x2="21" y1="18" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Svg>
const IconQuote = () => <Svg><path d="M6 17h3l2-4V7H5v6h3zM14 17h3l2-4V7h-6v6h3z" fill="currentColor" stroke="none" /></Svg>
const IconCode = () => <Svg><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Svg>
const IconLink = () => <Svg><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Svg>
const IconUnlink = () => <Svg><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /><line x1="3" x2="21" y1="3" y2="21" /></Svg>
const IconAlignLeft = () => <Svg><line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" /></Svg>
const IconAlignCenter = () => <Svg><line x1="21" x2="3" y1="6" y2="6" /><line x1="17" x2="7" y1="12" y2="12" /><line x1="19" x2="5" y1="18" y2="18" /></Svg>
const IconAlignRight = () => <Svg><line x1="21" x2="3" y1="6" y2="6" /><line x1="21" x2="9" y1="12" y2="12" /><line x1="21" x2="7" y1="18" y2="18" /></Svg>
const IconImage = () => <Svg><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></Svg>
const IconHighlighter = () => <Svg><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></Svg>
const IconUndo = () => <Svg><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" /></Svg>
const IconRedo = () => <Svg><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" /></Svg>

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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-700'
          : 'text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

const Divider = () => <span className="mx-1 my-1 w-px self-stretch bg-border" />

export function RichEditor({ value, onChange }: RichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [highlightColor, setHighlightColor] = useState('#fde68a')
  const [textColor, setTextColor] = useState('#111827')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
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

  const currentTextColor =
    (editor.getAttributes('textStyle').color as string | undefined) ?? textColor

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-canvas px-2 py-2">
        {/* Inline format */}
        <ToolbarButton title="굵게 (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <IconBold />
        </ToolbarButton>
        <ToolbarButton title="기울임 (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <IconItalic />
        </ToolbarButton>
        <ToolbarButton title="밑줄 (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <IconUnderline />
        </ToolbarButton>
        <ToolbarButton title="취소선" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <IconStrike />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton title="제목 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          제목1
        </ToolbarButton>
        <ToolbarButton title="제목 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          제목2
        </ToolbarButton>
        <ToolbarButton title="제목 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          제목3
        </ToolbarButton>

        <Divider />

        {/* Lists / blocks */}
        <ToolbarButton title="글머리 목록" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <IconList />
        </ToolbarButton>
        <ToolbarButton title="번호 목록" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <IconOrderedList />
        </ToolbarButton>
        <ToolbarButton title="인용구" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <IconQuote />
        </ToolbarButton>
        <ToolbarButton title="코드 블록" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <IconCode />
        </ToolbarButton>

        <Divider />

        {/* Text color */}
        <label
          title="글자색"
          className="relative inline-flex h-8 w-8 cursor-pointer flex-col items-center justify-center rounded-md hover:bg-muted"
        >
          <span className="text-sm font-bold leading-none">A</span>
          <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: currentTextColor }} />
          <input
            type="color"
            className="sr-only"
            value={textColor}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value
              setTextColor(v)
              editor.chain().focus().setColor(v).run()
            }}
          />
        </label>

        {/* Highlight: toggle + color picker */}
        <ToolbarButton
          title="형광펜"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()}
        >
          <IconHighlighter />
        </ToolbarButton>
        <label
          title="형광펜 색"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
        >
          <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: highlightColor }} />
          <input
            type="color"
            className="sr-only"
            value={highlightColor}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value
              setHighlightColor(v)
              editor.chain().focus().setHighlight({ color: v }).run()
            }}
          />
        </label>

        <Divider />

        {/* Link */}
        <ToolbarButton title="링크 추가" active={editor.isActive('link')} onClick={openLinkEditor}>
          <IconLink />
        </ToolbarButton>
        <ToolbarButton title="링크 해제" onClick={unsetLink}>
          <IconUnlink />
        </ToolbarButton>

        <Divider />

        {/* Align */}
        <ToolbarButton title="왼쪽 정렬" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <IconAlignLeft />
        </ToolbarButton>
        <ToolbarButton title="가운데 정렬" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <IconAlignCenter />
        </ToolbarButton>
        <ToolbarButton title="오른쪽 정렬" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <IconAlignRight />
        </ToolbarButton>

        <Divider />

        {/* Image */}
        <ToolbarButton title="이미지 업로드" onClick={() => imageInputRef.current?.click()}>
          <IconImage />
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

        <Divider />

        {/* History */}
        <ToolbarButton title="실행 취소 (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
          <IconUndo />
        </ToolbarButton>
        <ToolbarButton title="다시 실행 (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
          <IconRedo />
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
