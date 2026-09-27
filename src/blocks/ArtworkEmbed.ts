import type { Block } from 'payload'

/** Embeds a collection artwork inside Lexical rich text (stories, exhibition texts, bios). */
export const ArtworkEmbed: Block = {
  slug: 'artworkEmbed',
  interfaceName: 'ArtworkEmbedBlock',
  labels: { singular: 'Artwork', plural: 'Artworks' },
  fields: [
    { name: 'artwork', type: 'relationship', relationTo: 'artworks', required: true },
    { name: 'caption', type: 'text', admin: { description: 'Optional; defaults to the artwork label.' } },
    {
      name: 'size',
      type: 'select',
      defaultValue: 'wide',
      options: [
        { label: 'Wide', value: 'wide' },
        { label: 'Inset', value: 'inset' },
      ],
    },
  ],
}
