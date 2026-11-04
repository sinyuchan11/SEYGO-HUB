import sanitizeHtml from 'sanitize-html'

// 글 본문(TipTap 이 만든 HTML)을 서버에서 정리한다.
//
// 예전에는 PostDetail(클라이언트 컴포넌트) 안에서 isomorphic-dompurify 를 썼는데,
// 서버 렌더 때 jsdom 을 끌어와 Vercel 에서만 SSR 이 깨졌다(글 상세가 HTTP 500,
// 브라우저가 대신 그려서 겉보기엔 멀쩡했다). sanitize-html 은 DOM 없이 동작한다.
//
// 허용 목록은 RichEditor 의 확장(StarterKit, Underline, TextStyle+Color,
// Highlight multicolor, Link, Image, TextAlign)이 만드는 것만 둔다.

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i]
const ALIGN = [/^(left|right|center|justify)$/]

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'span', 'mark',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    mark: ['data-color', 'style'],
    span: ['style'],
    p: ['style'],
    h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
    ol: ['start'],
  },
  allowedStyles: {
    span: { color: COLOR },
    mark: { 'background-color': COLOR, color: COLOR },
    p: { 'text-align': ALIGN },
    h1: { 'text-align': ALIGN }, h2: { 'text-align': ALIGN }, h3: { 'text-align': ALIGN },
    h4: { 'text-align': ALIGN }, h5: { 'text-align': ALIGN }, h6: { 'text-align': ALIGN },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // 외부 링크는 새 탭 + opener 차단
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
  },
}

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html ?? '', OPTIONS)
}
