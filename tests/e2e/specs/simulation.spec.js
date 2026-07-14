// Simulation 2.0: voice-start from another screen (pending replay),
// forces appear even before tiles, director camera, mobile cinema chrome.
const { test, expect } = require('@playwright/test')
const { PHONE, appEvent, login, goTo, newCtx } = require('./helpers')

test.describe('סימולציה 2.0', () => {
  let ctx, page

  test.beforeAll(async ({ browser }, testInfo) => {
    ctx = await newCtx(browser, testInfo, PHONE)
    page = await ctx.newPage()
    await login(page)
  })

  test.afterAll(async () => { await ctx?.close() })

  test('התחלה קולית ממסך אחר — ניווט + הפעלה אוטומטית', async () => {
    await goTo(page, '/area')
    // what simDispatch does when the user asks for the simulation elsewhere
    await page.evaluate(() => {
      sessionStorage.setItem('sadan_sim_pending', JSON.stringify([
        { name: 'sadan:sim_set_phase', detail: { phase: 0 } },
        { name: 'sadan:sim_resume', detail: {} },
      ]))
      window.dispatchEvent(new CustomEvent('sadan:navigate', { detail: { path: '/simulation' } }))
    })
    await page.waitForURL('**/simulation')
    // forces on the map (markers work even without tile network)
    await expect(async () => {
      const n = await page.locator('.maplibregl-marker').count()
      expect(n).toBeGreaterThan(10)
    }).toPass({ timeout: 15_000 })
    // pending consumed + playback actually started
    await expect(async () => {
      expect(await page.evaluate(() => sessionStorage.getItem('sadan_sim_pending'))).toBeNull()
    }).toPass({ timeout: 15_000 })
  })

  test('מצלמת במאי — מבט אויב', async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('sadan:sim_camera', { detail: { view: 'enemy' } })))
    const enemyBtn = page.locator('button[title="נקודת מבט האויב"]')
    await expect(enemyBtn).toHaveClass(/bg-demo-gold/, { timeout: 5_000 })
    // back to overview
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('sadan:sim_camera', { detail: { view: 'overview' } })))
    await expect(page.locator('button[title="מבט על"]')).toHaveClass(/bg-demo-gold/, { timeout: 5_000 })
  })

  test('מעבר שלב — כרזת שלב מופיעה', async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('sadan:sim_goto_phase', { detail: { phase: 3 } })))
    await expect(page.getByText('שלב ד׳', { exact: false }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('קפיצת שלב דרך sim_set_phase (ערוץ הפקודות של סדן)', async () => {
    // this listener was silently broken (setPhase undefined) — keep it covered
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('sadan:sim_set_phase', { detail: { phase: 6 } })))
    await expect(page.getByText('כיבוש יעד ב׳', { exact: false }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('מובייל — גלולת שליטה וכרטיס קריינות', async () => {
    // cinema mode hides the chrome after 5s idle — a tap brings it back
    await page.mouse.click(187, 300)
    await expect(page.getByText('הקש לקריינות', { exact: false })).toBeVisible({ timeout: 5_000 })
    await page.getByText('הקש לקריינות', { exact: false }).click()
    // narration bubble opens with the phase-6 narration content
    await expect(page.getByText('בטונדה מרכזית', { exact: false }).first()).toBeVisible({ timeout: 3_000 })
  })
})
