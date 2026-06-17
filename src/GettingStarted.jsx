import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { renderDirection, teardown } from './lib/gs-kit.js'
import './getting-started.css'

/**
 * Getting Started — the onboarding + pricing walk-through.
 * Renders one of two design directions (ported from the Clay prototype):
 *   • Direction A · Editorial Spine  (default) — single-column numbered walk-through
 *   • Direction B · Workspace Guide  (?v=b)    — sticky live-pricing rail
 * Both share the same interactive kit: submission tabs, institution picker,
 * pricing tiers, course-by-course invoicing, payment methods, live deposit math.
 */
export default function GettingStarted() {
  const rootRef = useRef(null)
  const { search } = useLocation()
  const kind = new URLSearchParams(search).get('v') === 'b' ? 'b' : 'a'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    document.title = 'Getting Started — Meridian Studio'
    renderDirection(el, kind)
    window.scrollTo(0, 0)
    return () => teardown(el)
  }, [kind])

  return <div ref={rootRef} className={`gs dir-${kind}`} />
}
