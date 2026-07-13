// UI hygiene: on every screen, phone + desktop — no interactive element
// overflows the viewport or overlaps a sibling; no console errors.
const { test, expect } = require('@playwright/test')
const { PHONE, DESKTOP, appEvent, login, newCtx, findUiDefects } = require('./helpers')

const SCREENS = [
  '/field-selection', '/area', '/calendar', '/questionnaire',
  '/plans', '/exercise', '/quiz', '/approvals', '/simulation',
]

for (const [name, viewport] of [['phone', PHONE], ['desktop', DESKTOP]]) {
  test.describe(`חפיפות ושגיאות — ${name}`, () => {
    let ctx, page, consoleErrors

    test.beforeAll(async ({ browser }, testInfo) => {
      ctx = await newCtx(browser, testInfo, viewport)
      page = await ctx.newPage()
      consoleErrors = []
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
      })
      await login(page)
    })

    test.afterAll(async () => { await ctx?.close() })

    for (const screen of SCREENS) {
      test(`${screen}`, async () => {
        await appEvent(page, 'sadan:navigate', { path: screen })
        await page.waitForURL(`**${screen}`, { timeout: 10_000 })
        await page.waitForTimeout(2_500) // maps/animations settle
        const defects = await findUiDefects(page)
        expect(defects, `UI defects on ${screen} (${name}):\n${defects.join('\n')}`).toEqual([])
      })
    }

    test('אפס שגיאות console לאורך כל הזרימה', async () => {
      const real = consoleErrors.filter(e =>
        !e.includes('favicon') && !e.includes('AudioContext') && !e.includes('Failed to load resource'))
      expect(real, `Console errors:\n${real.join('\n')}`).toEqual([])
    })
  })
}
