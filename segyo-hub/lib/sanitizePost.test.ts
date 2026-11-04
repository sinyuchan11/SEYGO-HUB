import { describe, expect, it } from 'vitest'
import { sanitizePostHtml } from './sanitizePost'

describe('sanitizePostHtml', () => {
  it('에디터 서식은 남긴다', () => {
    const html =
      '<h2 style="text-align: center">제목</h2>' +
      '<p style="text-align: right"><strong>굵게</strong> <em>기울임</em> <u>밑줄</u> <s>취소</s></p>' +
      '<p><span style="color: #ff0000">빨강</span> <mark data-color="#fde68a" style="background-color: #fde68a; color: inherit">형광</mark></p>' +
      '<ul><li><p>항목</p></li></ul><blockquote><p>인용</p></blockquote><pre><code>code</code></pre>' +
      '<img src="https://x.supabase.co/storage/v1/object/public/post-images/a.png" alt="그림">'
    const out = sanitizePostHtml(html)
    expect(out).toContain('<h2 style="text-align:center">제목</h2>')
    expect(out).toContain('<strong>굵게</strong>')
    expect(out).toContain('<u>밑줄</u>')
    expect(out).toContain('<s>취소</s>')
    expect(out).toContain('style="color:#ff0000"')
    expect(out).toContain('background-color:#fde68a')
    expect(out).toContain('<blockquote>')
    expect(out).toContain('<img src="https://x.supabase.co/storage/v1/object/public/post-images/a.png" alt="그림" />')
  })

  it('스크립트·이벤트 핸들러·javascript: 링크를 지운다', () => {
    const out = sanitizePostHtml(
      '<p onclick="alert(1)">a</p><script>alert(1)</script>' +
      '<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">' +
      '<iframe src="https://evil"></iframe><svg><script>alert(1)</script></svg>' +
      '<img src="data:image/svg+xml;base64,AAAA">'
    )
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|iframe|svg|data:/i)
  })

  it('허용하지 않은 스타일은 지운다', () => {
    const out = sanitizePostHtml('<span style="position: fixed; color: red; background: url(https://evil)">a</span>')
    expect(out).toBe('<span style="color:red">a</span>')
  })

  it('링크는 새 탭 + opener 차단', () => {
    expect(sanitizePostHtml('<a href="https://example.com">e</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">e</a>'
    )
  })
})
