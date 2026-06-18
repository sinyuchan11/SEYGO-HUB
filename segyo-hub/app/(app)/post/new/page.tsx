import { PostForm } from '@/components/post/PostForm'

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">무슨 생각을 나눠볼까요?</h1>
          <p className="mt-1 text-sm text-muted-fg">생각을 자유롭게 적어보세요</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface shadow-sm px-6 py-6">
          <PostForm />
        </div>
      </div>
    </div>
  )
}
