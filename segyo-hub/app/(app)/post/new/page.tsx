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
