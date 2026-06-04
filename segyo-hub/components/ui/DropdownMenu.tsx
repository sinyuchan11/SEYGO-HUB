'use client'

import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'

/** Dropdown menu built on Radix. Compose: DropdownMenu > DropdownMenuTrigger, DropdownMenuContent > DropdownMenuItem. */
export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'cursor-pointer rounded-md px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
