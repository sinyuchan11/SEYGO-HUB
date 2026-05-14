import { BottomNav } from '@/components/layout/BottomNav'
import { NotificationBell } from '@/components/layout/NotificationBell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold">Segyo Hub</h1>
        <NotificationBell />
      </header>
      {children}
      <BottomNav />
    </div>
  )
}
