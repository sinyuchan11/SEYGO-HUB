import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Clock,
  FileText,
  Flame,
  Heart,
  House,
  LayoutGrid,
  List,
  MessageCircle,
  MessagesSquare,
  Moon,
  Pencil,
  Plus,
  Reply,
  Search,
  SquarePen,
  Sun,
  Trash2,
  UserRound,
  Utensils,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type IconProps = { size?: number; className?: string }

type LucideComponent = typeof Check

/**
 * Wrap a Lucide icon so every icon in the app shares one default size, stroke
 * weight and shrink behaviour. Call sites keep the same `{ size, className }`
 * shape the hand-inlined SVGs used to take.
 */
function icon(Source: LucideComponent, name: string) {
  function Icon({ size = 18, className }: IconProps) {
    return (
      <Source
        size={size}
        strokeWidth={2}
        className={cn('shrink-0', className)}
        aria-hidden="true"
      />
    )
  }
  Icon.displayName = name
  return Icon
}

/* ── Content & meta ──────────────────────────────────────────────── */
export const FlameIcon = icon(Flame, 'FlameIcon')
export const ClockIcon = icon(Clock, 'ClockIcon')
export const UtensilsIcon = icon(Utensils, 'UtensilsIcon')
export const CalendarIcon = icon(Calendar, 'CalendarIcon')
export const MessageIcon = icon(MessageCircle, 'MessageIcon')
export const ReplyIcon = icon(Reply, 'ReplyIcon')
export const BellIcon = icon(Bell, 'BellIcon')
export const SearchIcon = icon(Search, 'SearchIcon')
export const PenIcon = icon(Pencil, 'PenIcon')
export const FileTextIcon = icon(FileText, 'FileTextIcon')
export const SunIcon = icon(Sun, 'SunIcon')
export const MoonIcon = icon(Moon, 'MoonIcon')
export const PlusIcon = icon(Plus, 'PlusIcon')
export const TrashIcon = icon(Trash2, 'TrashIcon')

/* ── Navigation ──────────────────────────────────────────────────── */
export const HomeIcon = icon(House, 'HomeIcon')
export const BoardIcon = icon(MessagesSquare, 'BoardIcon')
export const PenSquareIcon = icon(SquarePen, 'PenSquareIcon')
export const UserIcon = icon(UserRound, 'UserIcon')

/* ── Controls ────────────────────────────────────────────────────── */
export const GridIcon = icon(LayoutGrid, 'GridIcon')
export const ListIcon = icon(List, 'ListIcon')
export const CheckIcon = icon(Check, 'CheckIcon')
export const XIcon = icon(X, 'XIcon')
export const ArrowRightIcon = icon(ArrowRight, 'ArrowRightIcon')

/** Heart with an optional solid fill, used for the like button's on-state. */
export function HeartIcon({
  size = 18,
  className,
  filled,
}: IconProps & { filled?: boolean }) {
  return (
    <Heart
      size={size}
      strokeWidth={2}
      fill={filled ? 'currentColor' : 'none'}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    />
  )
}
