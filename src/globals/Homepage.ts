import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: { group: 'Site' },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'artwork', type: 'relationship', relationTo: 'artworks', required: true },
        { name: 'heading', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
    { name: 'featuredStory', type: 'relationship', relationTo: 'stories' },
    { name: 'featuredTour', type: 'relationship', relationTo: 'tours' },
    { name: 'featuredExhibition', type: 'relationship', relationTo: 'exhibitions' },
    {
      name: 'highlights',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
      maxRows: 12,
      admin: { description: 'Artworks shown in the "Highlights" strip.' },
    },
  ],
}
