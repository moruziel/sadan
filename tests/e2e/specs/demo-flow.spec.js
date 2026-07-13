// The full demo scenario, phone + wall side by side.
// Phone context drives the flow with the same events the voice layer uses;
// the wall context must follow every station.
const { test, expect } = require('@playwright/test')
const { PHONE, appEvent, login, goTo, newCtx, openWall, publishWallEvent } = require('./helpers')

test.describe('תרחיש הדמו המלא — טלפון + קיר', () => {
  let phoneCtx, phone, wall

  test.beforeAll(async ({ browser }, testInfo) => {
    phoneCtx = await newCtx(browser, testInfo, PHONE)
    phone = await phoneCtx.newPage()
    const w = await openWall(browser, testInfo)
    wall = w.page
  })

  test.afterAll(async () => {
    await phoneCtx?.close()
    await wall?.context()?.close()
  })

  async function snap(name) {
    await phone.screenshot({ path: `reports/stations/phone-${name}.png` })
    await wall.screenshot({ path: `reports/stations/wall-${name}.png` })
  }

  test('01 כניסה ידנית', async () => {
    await login(phone)
    await expect(phone.getByText('בחירת שטח אש')).toBeVisible()
    await snap('01-login')
  })

  test('02 בחירת שטח → מפה', async () => {
    await appEvent(phone, 'sadan:action', { action: 'select_field' })
    await phone.waitForURL('**/area', { timeout: 10_000 })
    // המפה נטענת (canvas של MapLibre)
    await expect(phone.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
    // הקיר עוקב
    await expect(wall.getByText('מפת שטח').first()).toBeVisible({ timeout: 10_000 })
    await snap('02-area')
  })

  test('03 שאלון — מילוי דרך אירועי הקול', async () => {
    await goTo(phone, '/questionnaire')
    await appEvent(phone, 'fillField', { field_id: 'readiness', value: 'aleph' })
    await appEvent(phone, 'fillField', { field_id: 'firingCond', value: 'רטוב' })
    await appEvent(phone, 'fillField', { field_id: 'topic', value: 'הסתערות ומחסה' })
    // רטוב ⇒ פינוי רכוב אוטומטי מופיע
    await expect(phone.getByText('פינוי רכוב').first()).toBeVisible({ timeout: 10_000 })
    // הקיר מציג את הפרמטרים
    await expect(wall.getByText('תכנון תרגיל').first()).toBeVisible({ timeout: 10_000 })
    await expect(wall.getByText('רטוב').first()).toBeVisible({ timeout: 10_000 })
    await snap('03-questionnaire')
  })

  test('04 מתווים — ניתוח על הקיר', async () => {
    await goTo(phone, '/plans')
    await expect(phone.getByText('איגוף מדרום')).toBeVisible({ timeout: 10_000 })
    // הקיר: רגע "סדן חושבת" + פירוק הציון של ההמלצה
    await expect(wall.getByText('סדן מנתחת מתווים')).toBeVisible({ timeout: 10_000 })
    await expect(wall.getByText('המלצת סדן')).toBeVisible({ timeout: 10_000 })
    await expect(wall.getByText('92', { exact: true }).first()).toBeVisible()
    await expect(wall.getByText('התאמה למטרות האימון').first()).toBeVisible()
    await snap('04-plans')
  })

  test('05 בחירת מתווה → תיק תרגיל + טאבי חובה', async () => {
    await appEvent(phone, 'sadan:action', { action: 'select_plan', plan_id: 'plan_1' })
    await phone.waitForURL('**/exercise', { timeout: 20_000 })
    await expect(phone.getByText('פקודה כללית')).toBeVisible({ timeout: 10_000 })
    // טאבי החובה לפני הבוחן (עיקרון בטיחות)
    await appEvent(phone, 'sadan:open_tab', { tab_id: 'fire' })
    await expect(phone.getByText('אזימוטי ירי').first()).toBeVisible({ timeout: 10_000 })
    await appEvent(phone, 'sadan:open_tab', { tab_id: 'natbam' })
    await expect(wall.getByText('תיק תרגיל').first()).toBeVisible({ timeout: 10_000 })
    await snap('05-exercise')
  })

  test('06 בוחן', async () => {
    await goTo(phone, '/quiz')
    await appEvent(phone, 'fillField', { field_id: 'answer', question_id: 1, answer_idx: 0 })
    await appEvent(phone, 'fillField', { field_id: 'answer', question_id: 2, answer_idx: 1 })
    await expect(wall.getByText('בוחן').first()).toBeVisible({ timeout: 10_000 })
    // הקיר סופר את ההתקדמות
    await expect(wall.getByText('נענו').first()).toBeVisible({ timeout: 10_000 })
    await snap('06-quiz')
  })

  test('07 אישורים — כולל תמלול שיחה מוזרק על הקיר', async () => {
    await goTo(phone, '/approvals')
    await expect(phone.getByText('מסלול אישורים').first()).toBeVisible({ timeout: 10_000 })
    await expect(wall.getByText('שיחה חיה').first()).toBeVisible({ timeout: 10_000 })
    // מדמים שיחה (בלי טלפון אמיתי): שני צדדים על הקיר
    await publishWallEvent(phone, { type: 'call_transcript', role: 'sadan', text: 'שלום, כאן מערכת סדן — בדיקת תמלול.' })
    await publishWallEvent(phone, { type: 'call_transcript', role: 'them', text: 'קיבלתי, מאשר. בדיקה עברה.' })
    await expect(wall.getByText('בדיקת תמלול')).toBeVisible({ timeout: 5_000 })
    await expect(wall.getByText('קיבלתי, מאשר. בדיקה עברה.')).toBeVisible({ timeout: 5_000 })
    await snap('07-approvals')
  })

  test('08 יציאה מסודרת', async () => {
    await appEvent(phone, 'sadan:navigate', { path: '/' })
    await phone.waitForURL(/\/$/, { timeout: 10_000 })
    await snap('08-exit')
  })
})
