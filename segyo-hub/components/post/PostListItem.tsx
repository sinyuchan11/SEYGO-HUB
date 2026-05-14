import Link from 'next/link'

export type PostListItemProps = {
  id: number
  title: string
  authorNickname: string | null
  isAnonymous: boolean
  createdAt: string
  commentCount: number
  likeCount: number
}

export function PostListItem(props: PostListItemProps) {
  const author = props.isAnonymous
    ? '익명'
    : (props.authorNickname ?? '(알 수 없음)')
  return (
    <Link
      href={`/post/${props.id}`}
      className="block border-b bg-white px-4 py-3 active:bg-gray-100"
    >
      <p className="line-clamp-1 font-medium">{props.title}</p>
      <div className="mt-1 flex gap-3 text-xs text-gray-500">
        <span>{author}</span>
        <span>{new Date(props.createdAt).toLocaleString('ko-KR')}</span>
        <span>💬 {props.commentCount}</span>
        <span>❤️ {props.likeCount}</span>
      </div>
    </Link>
  )
}
