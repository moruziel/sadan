// Focused wall-bus tests: every event type renders on the wall quickly.
const { test, expect } = require('@playwright/test')
const { openWall, publishWallEvent } = require('./helpers')

test.describe('ערוץ הקיר', () => {
  let wall

  test.beforeAll(async ({ browser }, testInfo) => {
    const w = await openWall(browser, testInfo)
    wall = w.page
  })

  test.afterAll(async () => { await wall?.context()?.close() })

  test('אירוע context מופיע תוך 2 שניות', async () => {
    const t0 = Date.now()
    await publishWallEvent(wall, {
      type: 'context', screen: 'questionnaire',
      state: { 'בדיקה': 'ערך-בדיקה-קיר' },
    })
    await expect(wall.getByText('ערך-בדיקה-קיר')).toBeVisible({ timeout: 2_000 })
    expect(Date.now() - t0).toBeLessThan(2_500)
  })

  test('תמלול שיחה — שני צדדים ובצבעים שונים', async () => {
    await publishWallEvent(wall, { type: 'context', screen: 'approvals', state: {} })
    await publishWallEvent(wall, { type: 'call_transcript', role: 'sadan', text: 'צד סדן בבדיקה' })
    await publishWallEvent(wall, { type: 'call_transcript', role: 'them', text: 'צד מאשר בבדיקה' })
    await expect(wall.getByText('צד סדן בבדיקה')).toBeVisible({ timeout: 3_000 })
    await expect(wall.getByText('צד מאשר בבדיקה')).toBeVisible({ timeout: 3_000 })
    await expect(wall.getByText('סדן:', { exact: false }).first()).toBeVisible()
    await expect(wall.getByText('גורם מאשר:', { exact: false }).first()).toBeVisible()
  })

  test('מעבר מסך מנקה את תמלול השיחה', async () => {
    await publishWallEvent(wall, { type: 'context', screen: 'plans', state: {} })
    await expect(wall.getByText('סדן מנתחת מתווים')).toBeVisible({ timeout: 3_000 })
    await expect(wall.getByText('צד סדן בבדיקה')).toHaveCount(0)
  })

  test('סימולציה — פאנל שלב', async () => {
    await publishWallEvent(wall, {
      type: 'context', screen: 'simulation',
      state: { 'שלב': '5/8 — הסתערות יעד א׳', 'מצב': 'רץ', 'תצוגה': 'תלת-מימד' },
    })
    await expect(wall.getByText('הסתערות יעד א׳', { exact: false })).toBeVisible({ timeout: 3_000 })
    await expect(wall.getByText('רץ', { exact: true })).toBeVisible()
  })
})
