import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArtImage } from '@/components/ArtImage'
import { ArtworkGrid } from '@/components/ArtworkCard'
import { categoryLabel, StoryCard } from '@/components/Cards'
import { RichText } from '@/components/RichText'
import { SectionHeading } from '@/components/Section'
import type { Artwork, Movement, Subject } from '@/payload-types'
import { asMedia, formatDate, populated, routes } from '@/lib/format'
import { getStories, getStoryBySlug } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStoryBySlug((await params).slug)
  return story ? { title: story.title, description: story.excerpt } : {}
}

export default async function StoryPage({ params }: Props) {
  const story = await getStoryBySlug((await params).slug)
  if (!story) notFound()

  const related = (story.relatedArtworks ?? []).map((a) => populated<Artwork>(a)).filter((a): a is Artwork => Boolean(a))
  const tags = [
    ...(story.movements ?? []).map((m) => populated<Movement>(m)).filter(Boolean).map((m) => ({ href: routes.movement(m!.slug ?? ''), label: m!.title })),
    ...(story.subjects ?? []).map((s) => populated<Subject>(s)).filter(Boolean).map((s) => ({ href: routes.collection(`?subject=${s!.slug}`), label: s!.title })),
  ]
  const more = (await getStories({ limit: 4 })).filter((s) => s.id !== story.id).slice(0, 3)

  return (
    <article>
      <header className="mx-auto max-w-3xl text-center">
        <Link href={`/stories?category=${story.category}`} className="text-xs uppercase tracking-[0.18em] text-accent hover:underline">
          {categoryLabel(story.category)}
        </Link>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{story.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted">{story.excerpt}</p>
        <p className="mt-6 text-sm text-muted">
          By {story.author} · {formatDate(story.publishedAt)}
          {story.readingTime ? ` · ${story.readingTime} min read` : ''}
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-5xl">
        <ArtImage media={asMedia(story.heroImage)} size="hero" priority sizes="(min-width: 1024px) 1024px, 100vw" className="mx-auto h-auto max-h-[75vh] w-auto rounded-sm" />
      </div>

      <div className="mx-auto mt-12 max-w-2xl">
        <RichText data={story.body} />
        {tags.length > 0 && (
          <div className="clear-both mt-12 flex flex-wrap gap-2 border-t border-line pt-6">
            {tags.map((t) => (
              <Link key={t.href} href={t.href} className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink">
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading title="Works in this story" />
          <ArtworkGrid artworks={related} />
        </section>
      )}
      {more.length > 0 && (
        <section className="mt-20">
          <SectionHeading title="More stories" href="/stories" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
