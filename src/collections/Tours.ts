import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Tours: CollectionConfig = {
  slug: 'tours',
  admin: {
    useAsTitle: 'title',
    group: 'Editorial',
    defaultColumns: ['title', 'theme', 'durationMinutes'],
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  defaultSort: 'title',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'intro', type: 'textarea', required: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      name: 'stops',
      type: 'array',
      minRows: 2,
      labels: { singular: 'Stop', plural: 'Stops' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'artwork', type: 'relationship', relationTo: 'artworks', required: true },
        { name: 'note', type: 'textarea', required: true, admin: { description: "The guide's commentary for this stop." } },
      ],
    },
    slug(),
    { name: 'theme', type: 'text', required: true, index: true, admin: { position: 'sidebar' } },
    {
      name: 'durationMinutes',
      type: 'number',
      required: true,
      label: 'Duration (minutes)',
      admin: { position: 'sidebar' },
    },
  ],
}
