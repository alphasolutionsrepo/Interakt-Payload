import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import type { Artwork, ArtworkEmbedBlock } from '@/payload-types'
import { asMedia, populated, routes } from '@/lib/format'

import { ArtImage } from './ArtImage'
import { attribution } from './ArtworkCard'

type NodeTypes = DefaultNodeTypes | SerializedBlockNode<ArtworkEmbedBlock>

function ArtworkEmbed({ block }: { block: ArtworkEmbedBlock }) {
  const artwork = populated<Artwork>(block.artwork)
  if (!artwork) return null
  const inset = block.size === 'inset'
  return (
    <figure className={inset ? 'not-prose my-8 sm:float-right sm:ml-8 sm:w-[45%]' : 'not-prose my-10'}>
      <Link href={routes.artwork(artwork.slug ?? '')} className="group block">
        <ArtImage
          media={asMedia(artwork.image)}
          size={inset ? 'card' : 'hero'}
          sizes={inset ? '(min-width: 640px) 320px, 100vw' : '(min-width: 768px) 720px, 100vw'}
          className="mx-auto h-auto max-h-[80vh] w-auto rounded-sm"
        />
        <figcaption className="mt-3 text-sm leading-snug text-muted group-hover:text-ink">
          {block.caption ?? (
            <>
              <span className="italic">{artwork.title}</span>, {attribution(artwork)}
              {artwork.dateDisplay ? `, ${artwork.dateDisplay}` : ''}
            </>
          )}
        </figcaption>
      </Link>
    </figure>
  )
}

const converters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    artworkEmbed: ({ node }) => <ArtworkEmbed block={node.fields} />,
  },
})

export function RichText({ data, className }: { data: SerializedEditorState | null | undefined; className?: string }) {
  if (!data) return null
  return (
    <LexicalRichText
      data={data}
      converters={converters}
      className={`prose prose-lumen prose-lg max-w-none ${className ?? ''}`}
    />
  )
}
