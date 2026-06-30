import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import SadanChat from './components/common/SadanChat'
import VoiceStatusOrb from './components/common/VoiceStatusOrb'
import DemoControlPanel from './components/common/DemoControlPanel'

import Login          from './screens/Login'
import FieldSelection  from './screens/FieldSelection'
import Area           from './screens/Area'
import AreaCalendar   from './screens/AreaCalendar'
import Questionnaire  from './screens/Questionnaire'
import Plans          from './screens/Plans'
import Exercise       from './screens/Exercise'
import Quiz           from './screens/Quiz'
import Approvals      from './screens/Approvals'
import DemoChecklist  from './screens/DemoChecklist'
import Simulation     from './screens/Simulation'

export default function App() {
  return (
    <BrowserRouter>
      {/* sadan-main-content נדחף ימינה כשהצ'אט נפתח */}
      <div className="sadan-main-content">
        <Routes>
          <Route path="/"                element={<Login />} />
          <Route path="/field-selection" element={<FieldSelection />} />
          <Route path="/area"            element={<Area />} />
          <Route path="/calendar"        element={<AreaCalendar />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/plans"         element={<Plans />} />
          <Route path="/exercise"      element={<Exercise />} />
          <Route path="/quiz"          element={<Quiz />} />
          <Route path="/approvals"     element={<Approvals />} />
          <Route path="/demo-check"    element={<DemoChecklist />} />
          <Route path="/simulation"    element={<Simulation />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* SadanChat — מחוץ ל-wrapper כדי שלא יידחף */}
      <SadanChatWrapper />
      {/* VoiceStatusOrb — אייקון קולי קבוע פינה ימנית עליונה */}
      <VoiceStatusOrbWrapper />
      {/* NavigationController — מקשיב לפקודות ניווט מהצ'אט */}
      <NavigationController />
      {/* DemoControlPanel — נסתר כברירת מחדל, Ctrl+Shift+→ לדילוג בין שלבי הדמו */}
      <DemoControlPanel />
    </BrowserRouter>
  )
}

// On these paths the chat panel/button is hidden but component stays mounted (WS alive)
// Login has its own mic UI. /demo-check has no voice.
const NO_CHAT_PATHS = new Set(['/', '/demo-check'])

function SadanChatWrapper() {
  const { pathname } = useLocation()
  return <SadanChat visible={!NO_CHAT_PATHS.has(pathname)} currentScreen={pathname} />
}

function VoiceStatusOrbWrapper() {
  const { pathname } = useLocation()
  // Hide on login (has its own mic UI) and demo-check
  return <VoiceStatusOrb visible={!NO_CHAT_PATHS.has(pathname)} />
}

// ── SADAN navigation controller — listens to voice/text nav commands ──
// Blocks navigation away from login until user has authenticated.
function NavigationController() {
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const authedRef  = useRef(false)   // set to true after sadan:authenticated event

  useEffect(() => {
    function onAuth() { authedRef.current = true }
    window.addEventListener('sadan:authenticated', onAuth)
    return () => window.removeEventListener('sadan:authenticated', onAuth)
  }, [])

  useEffect(() => {
    const handle = (e) => {
      const { path } = e.detail
      if (!path) return
      // Block voice navigation away from login unless authenticated
      if (pathname === '/' && !authedRef.current) return
      navigate(path)
    }
    window.addEventListener('sadan:navigate', handle)
    return () => window.removeEventListener('sadan:navigate', handle)
  }, [navigate, pathname])
  return null
}
