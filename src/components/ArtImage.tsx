import Image from 'next/image'

import type { Media } from '@/payload-types'

type Size = 'thumb' | 'card' | 'hero'

/** Renders a Payload media document at one of its generated sizes. */
export function ArtImage({
  media,
  size = 'card',
  className,
  sizes,
  priority,
}: {
  media: Media | null | undefined
  size?: Size
  className?: string
  sizes?: string
  priority?: boolean
}) {
  if (!media) return <div className={`bg-line ${className ?? ''}`} aria-hidden />
  const variant = media.sizes?.[size]
  const src = variant?.url || media.url
  const width = variant?.width || media.width
  const height = variant?.height || media.height
  if (!src || !width || !height) return null
  return (
    <Image
      src={src}
      alt={media.alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  )
}
