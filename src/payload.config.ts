import { postgresAdapter } from '@payloadcms/db-postgres'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { ArtworkEmbed } from './blocks/ArtworkEmbed'
import { Artists } from './collections/Artists'
import { Artworks } from './collections/Artworks'
import { Exhibitions } from './collections/Exhibitions'
import { Media } from './collections/Media'
import { Stories } from './collections/Stories'
import { Movements, Subjects } from './collections/Taxonomies'
import { Tours } from './collections/Tours'
import { Users } from './collections/Users'
import { Homepage } from './globals/Homepage'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Lumen',
    },
  },
  collections: [Artworks, Artists, Movements, Subjects, Stories, Exhibitions, Tours, Media, Users],
  globals: [Homepage, SiteSettings],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [ArtworkEmbed] })],
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
