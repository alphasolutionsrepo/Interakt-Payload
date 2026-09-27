import Link from 'next/link'

import type { Artwork } from '@/payload-types'
import { asMedia, populated, routes } from '@/lib/format'
import type { Artist } from '@/payload-types'

import { ArtImage } from './ArtImage'

export function attribution(a: Pick<Artwork, 'artist' | 'culture'>) {
  return populated<Artist>(a.artist)?.name ?? a.culture ?? 'Unknown maker'
}

export function ArtworkCard({ artwork, priority }: { artwork: Artwork; priority?: boolean }) {
  return (
    <Link href={routes.artwork(artwork.slug ?? '')} className="group block break-inside-avoid">
      <div className="overflow-hidden rounded-sm bg-surface">
        <ArtImage
          media={asMedia(artwork.image)}
          size="card"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="h-auto w-full transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-2.5 space-y-0.5">
        <p className="font-serif text-[15px] leading-snug group-hover:text-accent">{artwork.title}</p>
        <p className="text-xs text-muted">
          {attribution(artwork)}
          {artwork.dateDisplay ? `, ${artwork.dateDisplay}` : ''}
        </p>
      </div>
    </Link>
  )
}

/** Masonry-style grid that respects each image's own aspect ratio. */
export function ArtworkGrid({ artworks, priorityCount = 0 }: { artworks: Artwork[]; priorityCount?: number }) {
  return (
    <div className="columns-2 gap-5 space-y-7 sm:columns-3 lg:columns-4">
      {artworks.map((a, i) => (
        <ArtworkCard key={a.id} artwork={a} priority={i < priorityCount} />
      ))}
    </div>
  )
}
