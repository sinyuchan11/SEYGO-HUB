'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

/** An image that opens fullscreen (lightbox) when clicked. Esc or backdrop closes. */
export function ZoomableImage({
  src,
  alt,
  className,
}: {
  src: string
  alt?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        onClick={() => setOpen(true)}
        className={cn('cursor-zoom-in', className)}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full cursor-zoom-out rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
