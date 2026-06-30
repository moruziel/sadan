import axios from 'axios'

// Relative baseURL — proxied by Vite (vite.config.js). Works on localhost and through the tunnel.
const api = axios.create({
  baseURL: '',
})

export async function sendMessage(message, sessionId = null) {
  const { data } = await api.post('/api/chat', { message, session_id: sessionId })
  return data
}

export async function getSession(sessionId) {
  const { data } = await api.get(`/api/sessions/${sessionId}`)
  return data
}

export async function updateFlowStep(sessionId, flowStep) {
  const { data } = await api.patch(`/api/sessions/${sessionId}/flow-step`, {
    flow_step: flowStep,
  })
  return data
}

export async function getCoordinationRequests(sessionId) {
  const { data } = await api.get(`/api/sessions/${sessionId}/coordination`)
  return data
}
