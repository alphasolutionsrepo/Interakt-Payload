import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { slug } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { interaktAfterChange, interaktAfterDelete } from '@/interakt/hooks'
import { centuryLabel, eraFor } from '@/lib/normalize'
import { ARTWORK_TYPES, COLOR_FAMILIES, DEPARTMENTS, ERAS, REGIONS } from '@/lib/taxonomy'

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  admin: {
    useAsTitle: 'title',
    group: 'Collection',
    defaultColumns: ['title', 'artist', 'dateDisplay', 'department', 'movement', 'isOnView'],
    listSearchableFields: ['title', 'culture', 'medium'],
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: 'title',
  hooks: {
    afterChange: [revalidateAfterChange, interaktAfterChange('artworks')],
    afterDelete: [revalidateAfterDelete, interaktAfterDelete('artworks')],
    beforeChange: [
      // Derived facets stay consistent with the dates when an editor changes them.
      ({ data }) => {
        if (typeof data.yearStart === 'number') {
          data.century = centuryLabel(data.yearStart)
          data.era = eraFor(data.yearStart)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Short curatorial description.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Attribution',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'artist', type: 'relationship', relationTo: 'artists', index: true },
                {
                  name: 'culture',
                  type: 'text',
                  admin: { description: 'For works attributed to a culture rather than a named artist.' },
                },
              ],
            },
            { name: 'artistDisplay', type: 'textarea', admin: { description: 'Attribution line as shown on the label.' } },
            {
              type: 'row',
              fields: [
                { name: 'dateDisplay', type: 'text', label: 'Date' },
                { name: 'yearStart', type: 'number', admin: { description: 'Negative for BCE.' } },
                { name: 'yearEnd', type: 'number' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'century', type: 'text', index: true, admin: { readOnly: true, description: 'Set from the start year.' } },
                { name: 'era', type: 'select', options: ERAS, index: true, admin: { readOnly: true } },
              ],
            },
          ],
        },
        {
          label: 'Classification',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'department', type: 'select', options: DEPARTMENTS, index: true },
                { name: 'artworkType', type: 'select', options: ARTWORK_TYPES, index: true, label: 'Type' },
              ],
            },
            { name: 'movement', type: 'relationship', relationTo: 'movements', index: true, label: 'Movement / period' },
            { name: 'subjects', type: 'relationship', relationTo: 'subjects', hasMany: true },
            {
              type: 'row',
              fields: [
                { name: 'placeOfOrigin', type: 'text' },
                { name: 'country', type: 'text', index: true },
                { name: 'region', type: 'select', options: REGIONS, index: true },
              ],
            },
          ],
        },
        {
          label: 'Object',
          fields: [
            { name: 'medium', type: 'text' },
            {
              name: 'materials',
              type: 'text',
              hasMany: true,
            },
            {
              name: 'techniques',
              type: 'text',
              hasMany: true,
            },
            { name: 'dimensions', type: 'textarea' },
            {
              type: 'row',
              fields: [
                { name: 'colorFamily', type: 'select', options: COLOR_FAMILIES, index: true, label: 'Colour' },
                { name: 'dominantColor', type: 'text', label: 'Dominant colour (hex)' },
              ],
            },
          ],
        },
        {
          label: 'Provenance',
          fields: [
            { name: 'creditLine', type: 'textarea' },
            { name: 'referenceNumber', type: 'text' },
            {
              name: 'aicId',
              type: 'number',
              unique: true,
              index: true,
              label: 'AIC ID',
              admin: { description: 'Art Institute of Chicago object ID; the seed uses it to update in place.' },
            },
            { name: 'sourceUrl', type: 'text', label: 'Source URL' },
          ],
        },
      ],
    },
    slug(),
    {
      name: 'isOnView',
      type: 'checkbox',
      label: 'On view',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'gallery', type: 'text', admin: { position: 'sidebar' } },
  ],
}
