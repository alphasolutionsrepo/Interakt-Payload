import type { Metadata } from 'next'
import Link from 'next/link'

import { StoryCard } from '@/components/Cards'
import { PageHeader } from '@/components/Section'
import { STORY_CATEGORIES } from '@/lib/taxonomy'
import { getStories } from '@/lib/queries'

export const metadata: Metadata = { title: 'Stories' }

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const valid = STORY_CATEGORIES.some((c) => c.value === category) ? category : undefined
  const stories = await getStories({ category: valid })

  return (
    <>
      <PageHeader eyebrow="Read" title="Stories" intro="Essays, close looks and artist profiles from our curators." />
      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        <Link href="/stories" className={`rounded-full px-4 py-1.5 ${!valid ? 'bg-ink text-paper' : 'border border-line hover:border-ink'}`}>
          All
        </Link>
        {STORY_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/stories?category=${c.value}`}
            className={`rounded-full px-4 py-1.5 ${valid === c.value ? 'bg-ink text-paper' : 'border border-line hover:border-ink'}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
      </div>
    </>
  )
}
