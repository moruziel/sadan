import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import FloatingChat from './components/chat/FloatingChat'

import Login        from './screens/Login'
import Area         from './screens/Area'
import Questionnaire from './screens/Questionnaire'
import Plans        from './screens/Plans'
import Exercise     from './screens/Exercise'
import Quiz         from './screens/Quiz'
import Approvals    from './screens/Approvals'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Login />} />
        <Route path="/area"          element={<Area />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/plans"         element={<Plans />} />
        <Route path="/exercise"      element={<Exercise />} />
        <Route path="/quiz"          element={<Quiz />} />
        <Route path="/approvals"     element={<Approvals />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>

      {/* FloatingChat מופיע בכל מסך חוץ מ-Login */}
      <FloatingChatWrapper />
    </BrowserRouter>
  )
}

function FloatingChatWrapper() {
  const { pathname } = useLocation()
  if (pathname === '/') return null
  return <FloatingChat />
}
