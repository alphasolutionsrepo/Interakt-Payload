import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

const hooks = { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] }
const access = { read: anyone, create: authenticated, update: authenticated, delete: authenticated }

export const Movements: CollectionConfig = {
  slug: 'movements',
  admin: { useAsTitle: 'title', group: 'Taxonomy', defaultColumns: ['title', 'period'] },
  access,
  hooks,
  defaultSort: 'title',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'period', type: 'text', admin: { description: 'e.g. "c. 1860–1890"' } },
    { name: 'description', type: 'textarea' },
    {
      name: 'artworks',
      type: 'join',
      collection: 'artworks',
      on: 'movement',
      defaultLimit: 50,
      admin: { defaultColumns: ['title', 'artist', 'dateDisplay'] },
    },
    slug(),
  ],
}

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: { useAsTitle: 'title', group: 'Taxonomy' },
  access,
  hooks,
  defaultSort: 'title',
  fields: [
    { name: 'title', type: 'text', required: true },
    slug(),
  ],
}
