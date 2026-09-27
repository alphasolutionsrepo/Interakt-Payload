import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { readingMinutes } from '@/lib/lexical'

export const STORY_CATEGORIES = [
  { label: 'Essay', value: 'essay' },
  { label: 'Close Look', value: 'close-look' },
  { label: 'Artist Profile', value: 'artist-profile' },
  { label: 'Collection Notes', value: 'collection-notes' },
]

export const Stories: CollectionConfig = {
  slug: 'stories',
  admin: {
    useAsTitle: 'title',
    group: 'Editorial',
    defaultColumns: ['title', 'category', 'author', 'publishedAt', '_status'],
  },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: { drafts: true, maxPerDoc: 20 },
  defaultSort: '-publishedAt',
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    beforeChange: [
      ({ data }) => {
        if (data.body) data.readingTime = readingMinutes(data.body)
        if (data._status === 'published' && !data.publishedAt) data.publishedAt = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText', required: true },
    {
      name: 'relatedArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
      admin: { description: 'Shown under the story. Artworks embedded in the body are linked automatically.' },
    },
    slug(),
    {
      name: 'category',
      type: 'select',
      options: STORY_CATEGORIES,
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'author', type: 'text', required: true, admin: { position: 'sidebar' } },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'readingTime',
      type: 'number',
      admin: { position: 'sidebar', readOnly: true, description: 'Minutes; calculated from the body.' },
    },
    { name: 'movements', type: 'relationship', relationTo: 'movements', hasMany: true, admin: { position: 'sidebar' } },
    { name: 'subjects', type: 'relationship', relationTo: 'subjects', hasMany: true, admin: { position: 'sidebar' } },
  ],
}
