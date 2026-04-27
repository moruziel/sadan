import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import SadanChat from './components/common/SadanChat'

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
      {/* NavigationController — מקשיב לפקודות ניווט מהצ'אט */}
      <NavigationController />
    </BrowserRouter>
  )
}

// On these paths the chat UI is hidden but the component stays mounted (WS alive)
// Keeping only /demo-check hidden — all other screens are voice-navigable
const NO_CHAT_PATHS = new Set(['/demo-check'])

function SadanChatWrapper() {
  const { pathname } = useLocation()
  return <SadanChat visible={!NO_CHAT_PATHS.has(pathname)} />
}

// ── SADAN navigation controller — listens to voice/text nav commands ──
function NavigationController() {
  const navigate = useNavigate()
  useEffect(() => {
    const handle = (e) => {
      const { path } = e.detail
      if (path) navigate(path)
    }
    window.addEventListener('sadan:navigate', handle)
    return () => window.removeEventListener('sadan:navigate', handle)
  }, [navigate])
  return null
}
