import type { Metadata } from 'next'

import { PageHeader } from '@/components/Section'
import { SearchExperience } from '@/components/search/SearchExperience'

export const metadata: Metadata = { title: 'Search' }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return (
    <>
      <PageHeader
        eyebrow="Search"
        title="Search the collection"
        intro="Keyword and semantic search over every artwork, artist, story, tour and exhibition — powered by Interakt."
      />
      <SearchExperience initialQuery={q ?? ''} />
    </>
  )
}
