// Shared helpers for SADAN E2E specs.
const { expect } = require('@playwright/test')

const PHONE = { width: 375, height: 812 }
const WALL = { width: 1600, height: 900 }
const DESKTOP = { width: 1366, height: 768 }

// Dispatch the same CustomEvents the voice layer / demo panel use.
async function appEvent(page, name, detail = {}) {
  await page.evaluate(([n, d]) => {
    window.dispatchEvent(new CustomEvent(n, { detail: d }))
  }, [name, detail])
}

// Manual login (types the personal code) — marks the session authenticated
// for the NavigationController, exactly like a real user.
async function login(page) {
  await page.goto('/')
  await page.getByPlaceholder('הזן מספר אישי').fill('5236521')
  await page.getByText('כניסה למערכת').click()
  // success animation runs ~2.5s before the app navigates
  await page.waitForURL('**/field-selection', { timeout: 20_000 })
}

// Navigate via the voice-nav event (blocked pre-auth, so login() first).
async function goTo(page, path) {
  await appEvent(page, 'sadan:navigate', { path })
  await page.waitForURL(`**${path}`, { timeout: 10_000 })
}

// New context with the project-level auth + TLS settings (newContext does
// NOT inherit config.use — without this, corporate TLS interception breaks it).
async function newCtx(browser, testInfo, viewport) {
  const { httpCredentials } = testInfo.project.use
  return browser.newContext({ viewport, httpCredentials, ignoreHTTPSErrors: true })
}

// Open the wall display in its own context and wait for the live connection.
async function openWall(browser, testInfo) {
  const { baseURL } = testInfo.project.use
  const ctx = await newCtx(browser, testInfo, WALL)
  const page = await ctx.newPage()
  await page.goto(baseURL + '/wall')
  await expect(page.getByText('מחובר', { exact: true })).toBeVisible({ timeout: 15_000 })
  return { ctx, page }
}

// Publish an event straight to the wall bus (simulates backend-side events
// like live call transcripts, without placing a real phone call).
async function publishWallEvent(page, event) {
  await page.evaluate(async (ev) => {
    await fetch('/api/wall/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev),
    })
  }, event)
}

// Geometry: visible interactive elements that overflow the viewport or
// overlap each other. Parent-child containment is fine; siblings crossing
// by more than `tol` px are reported.
async function findUiDefects(page, tol = 3) {
  return page.evaluate((tolerance) => {
    const sel = 'button, a[href], input, select, [role="button"]'
    const inScroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) return true
      }
      return false
    }
    const isFixed = (el) => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const pos = getComputedStyle(p).position
        if (pos === 'fixed' || pos === 'sticky') return true
      }
      return false
    }
    const vw = window.innerWidth, vh = window.innerHeight
    const els = [...document.querySelectorAll(sel)].filter(el => {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false
      const r = el.getBoundingClientRect()
      if (r.width <= 4 || r.height <= 4) return false
      // fully off-canvas = intentionally hidden (slide-in panels) — not a defect
      if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) return false
      // map-internal elements: data markers overlap naturally at low zoom, and
      // the attribution links aren't UI we control
      if (el.closest('.maplibregl-marker') || el.closest('.maplibregl-ctrl-attrib')) return false
      return true
    })
    const label = el => (el.innerText || el.getAttribute('title') || el.tagName).trim().slice(0, 40)
    const defects = []
    const boxes = els.map(el => ({ el, r: el.getBoundingClientRect() }))

    for (const { el, r } of boxes) {
      // a defect = element STRADDLING a horizontal edge (partially cut off),
      // unless it lives in a scroll container (progress bar, tab strips)
      if ((r.left < -tolerance || r.right > vw + tolerance) && !inScroller(el)) {
        defects.push(`overflow: "${label(el)}" [${Math.round(r.left)},${Math.round(r.right)}] vw=${vw}`)
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        // floating (fixed/sticky) elements legitimately cover scrollable content
        // that passes beneath them — that's what floating means
        if (isFixed(a.el) !== isFixed(b.el)) continue
        // an element inside a scroll container is CLIPPED at its bounds — its
        // rect may cross an outside sibling, but no visual overlap is possible
        if (inScroller(a.el) !== inScroller(b.el)) continue
        const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        if (ox > tolerance && oy > tolerance) {
          defects.push(`overlap: "${label(a.el)}" × "${label(b.el)}" (${Math.round(ox)}×${Math.round(oy)}px)`)
        }
      }
    }
    return defects
  }, tol)
}

module.exports = { PHONE, WALL, DESKTOP, appEvent, login, goTo, newCtx, openWall, publishWallEvent, findUiDefects }
