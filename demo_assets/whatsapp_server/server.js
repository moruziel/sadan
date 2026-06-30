// Force UTF-8 encoding on Windows
process.stdout.setEncoding?.('utf8')
if (process.platform === 'win32') {
  try { require('child_process').execSync('chcp 65001', { stdio: 'ignore' }) } catch (_) {}
}

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const qrcode        = require('qrcode-terminal')
const QRCode        = require('qrcode')
const express       = require('express')
const cors          = require('cors')
require('dotenv').config()

const PORT       = process.env.PORT || 3001
const TEST_PHONE = process.env.TEST_PHONE || '972894275'

const app = express()
app.use(cors())
app.use(express.json({ type: 'application/json' }))

// ── WhatsApp Client ────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

let ready    = false
let messages = []   // הודעות נכנסות
let lastQR   = null // שמירת QR אחרון

client.on('qr', qr => {
  lastQR = qr
  console.log('\n📱 סרוק את ה-QR עם ווצאפ שלך:\n')
  qrcode.generate(qr, { small: true })
  console.log('\n👉 או פתח בדפדפן: http://localhost:3001/qr\n')
})

client.on('ready', () => {
  ready  = true
  lastQR = null
  console.log('✅ ווצאפ מחובר!')
  console.log(`   מספר מחובר: +${client.info?.wid?.user}`)
  console.log(`   שם: ${client.info?.pushname}`)
})

function handleMessage(msg) {
  console.log(`📩 הודעה: ${msg.from} → "${msg.body}"`)
  messages.push({
    from:      msg.from,
    body:      msg.body,
    timestamp: new Date().toISOString(),
  })
  if (messages.length > 50) messages.shift()
}

client.on('message',        handleMessage)  // הודעות נכנסות מאחרים
client.on('message_create', handleMessage)  // הודעות עצמיות (שולח לעצמו)

client.initialize()

// ── Endpoints ──────────────────────────────────────────────

// בריאות השרת
app.get('/status', (req, res) => {
  res.json({ ready, phone: TEST_PHONE })
})

// QR כתמונה — לסריקה נוחה מהדפדפן
app.get('/qr', async (req, res) => {
  if (ready) {
    return res.send('<h2 style="font-family:sans-serif;color:green">✅ ווצאפ כבר מחובר!</h2>')
  }
  if (!lastQR) {
    return res.send('<h2 style="font-family:sans-serif;color:orange">⏳ ממתין ל-QR... רענן בעוד שנייה</h2>')
  }
  try {
    const png = await QRCode.toDataURL(lastQR, { width: 400, margin: 2 })
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>SADAN — סרוק QR</title>
        <meta http-equiv="refresh" content="20">
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column;
                 align-items: center; justify-content: center; height: 100vh;
                 margin: 0; background: #0c1117; color: white; }
          img  { border: 4px solid #c6953b; border-radius: 12px; }
          h2   { color: #c6953b; }
          p    { color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <h2>📱 סרוק עם ווצאפ → מכשירים מקושרים</h2>
        <img src="${png}" />
        <p>הדף מתרענן אוטומטית כל 20 שניות</p>
      </body>
      </html>
    `)
  } catch (err) {
    res.status(500).send('שגיאה ביצירת QR: ' + err.message)
  }
})

// שליחת הודעה
app.post('/send', async (req, res) => {
  const { phone = TEST_PHONE, message } = req.body

  if (!ready) {
    return res.status(503).json({ ok: false, error: 'ווצאפ לא מחובר' })
  }
  if (!message) {
    return res.status(400).json({ ok: false, error: 'חסר שדה message' })
  }

  try {
    const clean = phone.replace(/[^0-9]/g, '')
    let chatId = null
    const errors = []

    // ── ניסיון 1: getNumberId ──────────────────────────────
    try {
      const numberId = await client.getNumberId(clean)
      if (numberId) { chatId = numberId._serialized; console.log(`1️⃣  getNumberId: ${chatId}`) }
    } catch (e) { errors.push(`getNumberId: ${e.message}`) }

    // ── ניסיון 2: wid עצמי (שולח לעצמו) ──────────────────
    if (!chatId && client.info?.wid) {
      const myUser = client.info.wid.user
      if (myUser === clean || clean.endsWith(myUser) || myUser.endsWith(clean)) {
        chatId = client.info.wid._serialized
        console.log(`2️⃣  self-send: ${chatId}`)
      }
    }

    // ── ניסיון 3: @c.us ישיר ──────────────────────────────
    if (!chatId) {
      chatId = `${clean}@c.us`
      console.log(`3️⃣  direct @c.us: ${chatId}`)
    }

    await client.sendMessage(chatId, message)
    console.log(`📤 נשלח ל-${chatId}`)
    res.json({ ok: true, to: chatId })
  } catch (err) {
    console.error('❌ שגיאה בשליחה:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// שליחת הודעה עם תמונה — /send-media
// body: { phone?, message, mediaUrl, caption? }
app.post('/send-media', async (req, res) => {
  const { phone = TEST_PHONE, message, mediaUrl, caption } = req.body

  if (!ready) return res.status(503).json({ ok: false, error: 'ווצאפ לא מחובר' })
  if (!mediaUrl && !message) return res.status(400).json({ ok: false, error: 'חסר mediaUrl או message' })

  try {
    const clean = phone.replace(/[^0-9]/g, '')
    let chatId = `${clean}@c.us`
    try {
      const numberId = await client.getNumberId(clean)
      if (numberId) chatId = numberId._serialized
    } catch (_) {}

    if (mediaUrl) {
      console.log(`📸 מוריד תמונה: ${mediaUrl}`)
      const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true })
      const textCaption = caption || message || ''
      await client.sendMessage(chatId, media, { caption: textCaption })
      console.log(`📤 מדיה+טקסט נשלחו ל-${chatId}`)
    } else {
      await client.sendMessage(chatId, message)
      console.log(`📤 טקסט נשלח ל-${chatId}`)
    }

    res.json({ ok: true, to: chatId })
  } catch (err) {
    console.error('❌ שגיאה בשליחת מדיה:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// קבלת הודעות נכנסות
app.get('/messages', (req, res) => {
  res.json({ messages })
})

// מידע debug — מציג את מזהה המשתמש המחובר
app.get('/debug', (req, res) => {
  res.json({
    ready,
    wid: client.info?.wid,
    pushname: client.info?.pushname,
    platform: client.info?.platform,
  })
})

// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp server רץ על פורט ${PORT}`)
  console.log(`   טלפון לבדיקה: +${TEST_PHONE}`)
  console.log(`   QR בדפדפן: http://localhost:${PORT}/qr`)
  console.log(`   ממתין ל-QR...\n`)
})
