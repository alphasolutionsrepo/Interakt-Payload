import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access/public'
import { revalidateGlobal } from '@/hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { group: 'Site' },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'Lumen' },
    { name: 'tagline', type: 'text', defaultValue: 'The Open Collection' },
    { name: 'footerCredit', type: 'textarea' },
  ],
}
