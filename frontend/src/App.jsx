import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>

      {/* SadanChat מופיע בכל מסך חוץ מ-Login */}
      <SadanChatWrapper />
    </BrowserRouter>
  )
}

const NO_CHAT_PATHS = new Set(['/', '/field-selection', '/quiz', '/demo-check'])

function SadanChatWrapper() {
  const { pathname } = useLocation()
  if (NO_CHAT_PATHS.has(pathname)) return null
  return <SadanChat />
}
