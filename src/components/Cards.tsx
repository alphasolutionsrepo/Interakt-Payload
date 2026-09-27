import Link from 'next/link'

import type { Exhibition, Story, Tour } from '@/payload-types'
import { asMedia, exhibitionDates, exhibitionStatus, formatDate, routes } from '@/lib/format'
import { STORY_CATEGORIES } from '@/collections/Stories'

import { ArtImage } from './ArtImage'

export const categoryLabel = (value?: string | null) => STORY_CATEGORIES.find((c) => c.value === value)?.label ?? ''

export function StoryCard({ story, large }: { story: Story; large?: boolean }) {
  return (
    <Link href={routes.story(story.slug ?? '')} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-sm bg-surface">
        <ArtImage
          media={asMedia(story.heroImage)}
          size={large ? 'hero' : 'card'}
          sizes={large ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw'}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-accent">{categoryLabel(story.category)}</p>
      <h3 className={`mt-1 font-serif leading-snug group-hover:text-accent ${large ? 'text-3xl' : 'text-xl'}`}>{story.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{story.excerpt}</p>
      <p className="mt-3 text-xs text-muted">
        {story.author} · {formatDate(story.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
        {story.readingTime ? ` · ${story.readingTime} min read` : ''}
      </p>
    </Link>
  )
}

const STATUS_LABEL = { current: 'Now showing', upcoming: 'Coming soon', past: 'Past exhibition' } as const

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const status = exhibitionStatus(exhibition)
  return (
    <Link href={routes.exhibition(exhibition.slug ?? '')} className="group grid gap-4 sm:grid-cols-[2fr_3fr] sm:gap-6">
      <div className="aspect-[4/3] overflow-hidden rounded-sm bg-surface">
        <ArtImage
          media={asMedia(exhibition.heroImage)}
          size="card"
          sizes="(min-width: 640px) 40vw, 100vw"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-accent">
          {exhibition.venue === 'aic' ? 'From the archive · Art Institute of Chicago' : STATUS_LABEL[status]}
        </p>
        <h3 className="mt-1 font-serif text-2xl leading-snug group-hover:text-accent">{exhibition.title}</h3>
        <p className="mt-1 text-sm text-muted">{exhibitionDates(exhibition)}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{exhibition.summary}</p>
      </div>
    </Link>
  )
}

export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Link href={routes.tour(tour.slug ?? '')} className="group block">
      <div className="aspect-[3/2] overflow-hidden rounded-sm bg-surface">
        <ArtImage
          media={asMedia(tour.heroImage)}
          size="card"
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-accent">
        {tour.theme} · {tour.stops?.length ?? 0} stops · {tour.durationMinutes} min
      </p>
      <h3 className="mt-1 font-serif text-xl leading-snug group-hover:text-accent">{tour.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{tour.intro}</p>
    </Link>
  )
}
