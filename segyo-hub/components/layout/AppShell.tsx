import { TopBar } from './TopBar'
import { LeftRail } from './LeftRail'
import { RightRail } from './RightRail'
import { BottomNav } from './BottomNav'

export function AppShell({
  children,
  rightRail,
}: {
  children: React.ReactNode
  rightRail?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopBar />
      <div className="mx-auto flex max-w-[1400px] gap-2 px-2 pb-20 md:pb-2">
        <LeftRail />
        <main className="min-w-0 flex-1 py-2">{children}</main>
        {rightRail ? <RightRail>{rightRail}</RightRail> : null}
      </div>
      <BottomNav />
    </div>
  )
}
