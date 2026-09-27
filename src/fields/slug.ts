import { slugField } from 'payload'

import { slugify } from '@/lib/normalize'

/** Payload's slug field (with the "generate from title" toggle), using our slugify so seeded and edited slugs match. */
export const slug = (useAsSlug = 'title') =>
  slugField({
    useAsSlug,
    position: 'sidebar',
    slugify: ({ valueToSlugify }) => (valueToSlugify ? slugify(String(valueToSlugify)) : undefined),
  })
