'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 border-b border-border', className)}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:text-foreground data-[state=active]:border-primary-600 data-[state=active]:text-primary-700',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
