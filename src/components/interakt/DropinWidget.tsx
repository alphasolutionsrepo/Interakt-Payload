'use client'

import { useEffect, useId } from 'react'

import { publicConfig } from '@/interakt/public-config'

type WidgetKind = 'search' | 'chat'

interface DropinGlobal {
  init: (config: Record<string, unknown>) => void
  destroy?: (containerId: string) => void
  open?: (containerId: string) => void
}

declare global {
  interface Window {
    SearchDropinUI?: DropinGlobal
    ChatDropinUI?: DropinGlobal
  }
}

const GLOBAL_NAME: Record<WidgetKind, 'SearchDropinUI' | 'ChatDropinUI'> = {
  search: 'SearchDropinUI',
  chat: 'ChatDropinUI',
}

const BUNDLE_PATH = '/embed/v1/widgets.js'
const LOADED_FLAG = 'data-interakt-loaded'

/** One shared <script> for both widgets — loading it twice registers them twice. */
let bundlePromise: Promise<void> | null = null

/**
 * The bundle has executed if it has registered its globals. Checking this
 * first matters for a script tag that finished loading before we looked at it:
 * a `load` listener attached afterwards never fires, which would hang the
 * widget forever.
 */
function bundleReady(globalName: 'SearchDropinUI' | 'ChatDropinUI'): boolean {
  return typeof window !== 'undefined' && Boolean(window[globalName])
}

function loadBundle(baseUrl: string, globalName: 'SearchDropinUI' | 'ChatDropinUI'): Promise<void> {
  if (bundleReady(globalName)) return Promise.resolve()
  if (bundlePromise) return bundlePromise

  const src = `${baseUrl}${BUNDLE_PATH}`

  const attempt = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)

    if (existing) {
      // Already finished while we weren't watching.
      if (existing.getAttribute(LOADED_FLAG) === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.setAttribute(LOADED_FLAG, 'true')
      resolve()
    }
    script.onerror = () => {
      // Leave nothing behind that a retry would match and then wait on forever.
      script.remove()
      reject(new Error(`Could not load ${src}`))
    }
    document.head.appendChild(script)
  })

  // Don't cache a rejection: a transient failure would otherwise disable both
  // widgets until a full page reload.
  bundlePromise = attempt.catch((err) => {
    bundlePromise = null
    throw err
  })

  return bundlePromise
}

/**
 * The widgets render inside an *open* shadow root (`[data-interakt-widget]` inside our container),
 * so page CSS can't reach them and init() takes no custom-CSS option. This appends an extra
 * stylesheet to that shadow root once the widget has mounted it.
 */
function injectShadowCss(container: HTMLElement, css: string): () => void {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  const apply = () => {
    for (const host of container.querySelectorAll<HTMLElement>('[data-interakt-widget]')) {
      const root = host.shadowRoot
      if (root && !root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
    }
  }
  apply()
  // init() may attach the shadow host asynchronously (and re-create it), so keep watching.
  const observer = new MutationObserver(apply)
  observer.observe(container, { childList: true, subtree: true })
  return () => observer.disconnect()
}

export interface DropinWidgetProps {
  kind: WidgetKind
  /** Anything the widget's init() accepts: theme, primaryColor, launcher, mode… */
  config?: Record<string, unknown>
  className?: string
  /** Extra CSS applied inside the widget's shadow root (see injectShadowCss). */
  shadowCss?: string
}

/**
 * Mounts an Interakt drop-in widget.
 *
 * The Interakt docs show a `<script src=".../widget.js" data-token data-container>`
 * form — that isn't what ships. The real bundle registers a global and takes its
 * configuration through `init()`.
 */
export function DropinWidget({ kind, config, className, shadowCss }: DropinWidgetProps) {
  const reactId = useId()
  const containerId = `interakt-${kind}-${reactId.replace(/:/g, '')}`

  const accessToken = kind === 'search' ? publicConfig.searchToken : publicConfig.chatToken
  const { baseUrl } = publicConfig

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false
    let stopCss: (() => void) | undefined
    const globalName = GLOBAL_NAME[kind]

    loadBundle(baseUrl, globalName)
      .then(() => {
        if (cancelled) return
        const api = window[globalName]
        if (!api) {
          console.warn(`Interakt: window.${globalName} not found after loading the bundle`)
          return
        }
        api.init({ containerId, accessToken, apiBaseUrl: baseUrl, ...config })
        const container = document.getElementById(containerId)
        if (shadowCss && container) stopCss = injectShadowCss(container, shadowCss)
      })
      .catch((err) => console.error('Interakt widget failed to load:', err))

    return () => {
      cancelled = true
      stopCss?.()
      window[globalName]?.destroy?.(containerId)
    }
    // `config` is an object literal at every call site; stringify keeps the
    // effect from re-running on every render without freezing the values.
  }, [kind, baseUrl, accessToken, containerId, JSON.stringify(config), shadowCss]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!accessToken) {
    return (
      <div className={className}>
        <p className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted">
          Interakt {kind} widget not configured — set{' '}
          <code className="font-mono">
            NEXT_PUBLIC_INTERAKT_{kind === 'search' ? 'SEARCH' : 'CHAT'}_TOKEN
          </code>
          .
        </p>
      </div>
    )
  }

  return <div id={containerId} className={className} />
}
