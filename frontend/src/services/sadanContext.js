// sadanContext — single source of truth for "what the user sees right now".
// Screens report their state here; SadanChat subscribes and forwards changes
// to the Gemini session so SADAN can answer "מה אני רואה?" on any screen.
//
// Usage from a screen component:
//   import sadanContext from '../services/sadanContext'
//   useEffect(() => { sadanContext.setScreen('questionnaire', { readiness: 'א' }) }, [])
//   sadanContext.patch({ readiness: 'ב' })   // on any meaningful change
//
// State values should be short human-readable Hebrew strings/numbers —
// they are forwarded to Gemini as a system message, not parsed.

const DEBOUNCE_MS = 400

let _screen = ''
let _state = {}
let _subscribers = []
let _timer = null

function _notify() {
  clearTimeout(_timer)
  _timer = setTimeout(() => {
    const snapshot = get()
    _subscribers.forEach(cb => { try { cb(snapshot) } catch (_) {} })
  }, DEBOUNCE_MS)
}

export function setScreen(screen, state = {}) {
  _screen = screen
  _state = { ...state }
  _notify()
}

export function patch(partial) {
  _state = { ..._state, ...partial }
  _notify()
}

export function get() {
  // Drop empty values — keep the payload compact
  const state = {}
  for (const [k, v] of Object.entries(_state)) {
    if (v !== '' && v !== null && v !== undefined) state[k] = v
  }
  return { screen: _screen, state }
}

export function subscribe(cb) {
  _subscribers.push(cb)
  return () => { _subscribers = _subscribers.filter(s => s !== cb) }
}

export default { setScreen, patch, get, subscribe }
