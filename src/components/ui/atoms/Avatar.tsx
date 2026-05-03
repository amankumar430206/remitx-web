import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

export interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizeMap[size], className)}>
      <RadixAvatar.Image src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
      <RadixAvatar.Fallback className="flex h-full w-full items-center justify-center bg-primary text-primary-fg font-medium">
        {fallback ?? alt?.slice(0, 2).toUpperCase() ?? '?'}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
