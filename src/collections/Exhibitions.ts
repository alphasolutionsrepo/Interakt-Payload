import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  admin: {
    useAsTitle: 'title',
    group: 'Editorial',
    defaultColumns: ['title', 'venue', 'startDate', 'endDate'],
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  defaultSort: '-startDate',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'body', type: 'richText' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'artworks', type: 'relationship', relationTo: 'artworks', hasMany: true },
    slug(),
    {
      name: 'venue',
      type: 'select',
      defaultValue: 'lumen',
      required: true,
      index: true,
      options: [
        { label: 'Lumen', value: 'lumen' },
        { label: 'Art Institute of Chicago (archive)', value: 'aic' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'startDate',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' }, description: 'Leave empty for a permanent installation.' },
    },
    { name: 'sourceUrl', type: 'text', label: 'Source URL', admin: { position: 'sidebar' } },
    { name: 'aicId', type: 'number', unique: true, label: 'AIC ID', admin: { position: 'sidebar' } },
  ],
}
