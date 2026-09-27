import { redirect } from 'next/navigation'

import { routes } from '@/lib/format'

/** Subjects are browsed as a facet of the collection. */
export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  redirect(routes.collection(`?subject=${encodeURIComponent((await params).slug)}`))
}
