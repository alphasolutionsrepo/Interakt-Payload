import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Artists: CollectionConfig = {
  slug: 'artists',
  admin: {
    useAsTitle: 'name',
    group: 'Collection',
    defaultColumns: ['name', 'nationality', 'birthYear', 'deathYear'],
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: 'name',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'nationality', type: 'text', index: true },
        { name: 'birthYear', type: 'number' },
        { name: 'deathYear', type: 'number' },
      ],
    },
    { name: 'bio', type: 'richText' },
    { name: 'movements', type: 'relationship', relationTo: 'movements', hasMany: true },
    {
      name: 'artworks',
      type: 'join',
      collection: 'artworks',
      on: 'artist',
      defaultSort: 'yearStart',
      defaultLimit: 50,
      admin: { defaultColumns: ['title', 'dateDisplay', 'movement'] },
    },
    slug('name'),
    {
      name: 'aicId',
      type: 'number',
      unique: true,
      index: true,
      label: 'AIC ID',
      admin: { position: 'sidebar' },
    },
  ],
}
