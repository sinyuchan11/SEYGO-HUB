import { PostForm } from '@/components/post/PostForm'

export default function NewPostPage() {
  return (
    <main>
      <header className="border-b border-border bg-surface px-4 py-3 font-bold">새 글</header>
      <PostForm />
    </main>
  )
}
