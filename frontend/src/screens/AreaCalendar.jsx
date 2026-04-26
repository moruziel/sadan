/**
 * AreaCalendar — יומן זמינות שטחי אש
 * Booking-style: 5 שטחים × 14 ימים
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import Header from '../components/common/Header'
import { fieldBookings, calendarFields, generate14Days } from '../data/calendar.js'

const DAYS = generate14Days()
const MONTH_LABEL = 'אפריל–מאי 2026'

function getBooking(fieldId, date) {
  return (fieldBookings[fieldId] || []).find(b => b.date === date)
}

// Popup פרטי הזמנה
function BookingTooltip({ booking, onClose }) {
  return (
    <div className="absolute z-50 bg-white border border-gray-200 shadow-xl rounded-xl p-3 text-xs w-52"
      style={{ top: '110%', right: 0 }} dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-900 font-bold">{booking.unit}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="text-gray-600 space-y-1">
        <div><span className="text-gray-500">סוג: </span>{booking.type}</div>
        <div><span className="text-gray-500">שעות: </span>{booking.time}</div>
      </div>
    </div>
  )
}

// תא בלוח
function CalCell({ fieldId, day, isSelected, onSelect, fieldSelected }) {
  const [showTip, setShowTip] = useState(false)
  const booking = getBooking(fieldId, day.date)
  const isToday = day.date === '2026-05-05'

  // highlight ירוק אם:
  // - אין הזמנה AND
  // - השדה נבחר (selectedFieldId === fieldId) OR כל שדות "free"
  const isFree = !booking
  const isHighlighted = isSelected && isFree

  let cellBg = 'bg-gray-100'
  let cellText = 'text-gray-500'
  let cellBorder = 'border-gray-200'

  if (booking) {
    cellBg = 'bg-red-100'
    cellText = 'text-red-600'
    cellBorder = 'border-red-200'
  } else if (isHighlighted) {
    cellBg = 'bg-green-100'
    cellText = 'text-green-700'
    cellBorder = 'border-green-300'
  } else if (fieldSelected && isFree) {
    cellBg = 'bg-green-50'
    cellText = 'text-green-600'
    cellBorder = 'border-green-200'
  }

  if (day.isWeekend) {
    cellBg = booking ? cellBg : 'bg-gray-100/80'
    cellText = booking ? cellText : 'text-gray-600'
  }

  return (
    <td className={`relative border ${cellBorder} ${cellBg} text-center p-0`}>
      <button
        onClick={() => {
          if (booking) { setShowTip(v => !v); return }
          onSelect(day.date)
        }}
        className={`w-full h-10 flex items-center justify-center text-xs font-semibold
          ${booking ? 'cursor-pointer' : 'cursor-pointer hover:bg-black/5'}
          ${cellText}
          ${isToday ? 'ring-1 ring-inset ring-amber-500' : ''}
        `}
        title={booking ? `${booking.unit} — ${booking.type} ${booking.time}` : 'לחץ לבחירה'}
      >
        {booking
          ? <span className="text-[11px] truncate max-w-[56px] px-1">{booking.unit.replace('גדוד ', 'גד׳ ')}</span>
          : isFree
            ? <span className="text-[11px] opacity-50">פנוי</span>
            : null
        }
      </button>
      {showTip && booking && (
        <BookingTooltip booking={booking} onClose={() => setShowTip(false)} />
      )}
    </td>
  )
}

export default function AreaCalendar() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const initFieldId = location.state?.fieldId || '309h'

  const [selectedField,   setSelectedField]   = useState(initFieldId)
  const [selectedDate,    setSelectedDate]     = useState(null)
  const [requestSent,     setRequestSent]      = useState(false)
  const [conflictField,   setConflictField]    = useState(null)

  function handleDateSelect(fieldId, date) {
    const booking = getBooking(fieldId, date)
    if (booking) return
    setSelectedDate(date)
    setSelectedField(fieldId)
    setConflictField(null)
    setRequestSent(false)
  }

  function handleBookRequest() {
    if (!selectedDate) return
    const booking = getBooking('309h', selectedDate)
    if (booking && selectedField === '309h') {
      // קונפליקט
      setConflictField('309h')
    } else {
      setRequestSent(true)
    }
  }

  const selectedInfo = calendarFields.find(f => f.id === selectedField)
  const selectedDateFmt = selectedDate
    ? new Date(selectedDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
      <Header currentPath="/area" />

      <div className="flex flex-1 overflow-hidden gap-0">

        {/* פאנל שמאל — שדות */}
        <div className="w-36 bg-white border-l border-gray-200 flex flex-col">
          <div className="px-3 py-3 border-b border-gray-200">
            <div className="text-gray-900 font-bold text-sm">שטחי אש</div>
            <div className="text-gray-500 text-xs">אזור 251</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {calendarFields.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedField(f.id); setSelectedDate(null) }}
                className={`w-full text-right px-3 py-3 border-b border-gray-200 text-xs transition-all
                  ${selectedField === f.id
                    ? 'bg-amber-50 border-r-2 border-r-amber-500'
                    : 'hover:bg-gray-100'
                  }`}
              >
                <div className={`font-bold ${selectedField === f.id ? 'text-amber-600' : 'text-gray-900'}`}>
                  {f.name}
                  {f.recommended && <span className="text-amber-600 mr-1">★</span>}
                </div>
                <div className="text-gray-500 text-[11px]">{f.region}</div>
              </button>
            ))}
          </div>
        </div>

        {/* לוח שנה */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ניווט */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <button className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} />
            </button>
            <div className="text-gray-900 font-bold text-sm flex items-center gap-2">
              <Calendar size={16} className="text-amber-600" />
              {MONTH_LABEL}
            </div>
            <button className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* טבלה */}
          <div className="flex-1 overflow-auto p-3">
            <table className="w-full border-collapse text-xs table-fixed" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th className="w-24 text-right px-2 py-2 text-gray-500 font-semibold border border-gray-200 bg-gray-50 sticky right-0 z-10">
                    שטח
                  </th>
                  {DAYS.map(d => (
                    <th key={d.date}
                      className={`text-center py-2 border border-gray-200 font-semibold
                        ${d.isWeekend ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-600'}
                        ${d.date === '2026-05-05' ? 'text-amber-600' : ''}
                      `}
                    >
                      <div className="text-[11px]">{d.dayName}</div>
                      <div className="text-base font-black leading-tight">{d.dayNum}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarFields.map(field => (
                  <tr key={field.id}>
                    <td className={`sticky right-0 z-10 px-2 py-2 border border-gray-200 text-right
                      ${selectedField === field.id ? 'bg-amber-50' : 'bg-white'}
                    `}>
                      <div className={`font-bold text-xs ${selectedField === field.id ? 'text-amber-600' : 'text-gray-900'}`}>
                        {field.name}
                        {field.recommended && <span className="text-amber-600 mr-1 text-[11px]">★</span>}
                      </div>
                      <div className="text-gray-500 text-[11px]">{field.region}</div>
                    </td>
                    {DAYS.map(day => (
                      <CalCell
                        key={day.date}
                        fieldId={field.id}
                        day={day}
                        isSelected={selectedField === field.id && selectedDate === day.date}
                        fieldSelected={selectedField === field.id}
                        onSelect={date => handleDateSelect(field.id, date)}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">

            {/* קונפליקט */}
            {conflictField && (
              <div className="mb-3 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-sm text-orange-700 flex items-start gap-2" dir="rtl">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">⚠️ {calendarFields.find(f => f.id === conflictField)?.name} תפוס בתאריך הזה.</div>
                  <div className="text-orange-600 text-xs mt-1">
                    💡 310א פנוי באותו תאריך — מתאים לתרגיל שלך.
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">
                      עבור ל-310א
                    </button>
                    <button onClick={() => setConflictField(null)} className="text-orange-600 text-xs px-2 py-1.5 hover:text-orange-800">
                      בחר תאריך אחר
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* הצלחה */}
            {requestSent && (
              <div className="mb-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle size={16} />
                <div>
                  <span className="font-bold">בקשה נשלחה ⏳ </span>
                  <span className="text-xs text-green-600">
                    {selectedInfo?.name} — {selectedDateFmt} — ממתין לאישור מתא"ם שטחים
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block"/>
                  פנוי
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block"/>
                  תפוס
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm border border-amber-500 inline-block"/>
                  היום
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm rounded-lg hover:bg-gray-100 transition-all"
                >
                  ← חזרה
                </button>
                <button
                  onClick={handleBookRequest}
                  disabled={!selectedDate || requestSent}
                  className="px-5 py-2 bg-amber-500 text-black font-bold text-sm rounded-xl
                    hover:opacity-90 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center gap-2"
                >
                  {requestSent ? '✓ בקשה נשלחה' : selectedDate ? `תפוס ${selectedInfo?.name} — ${selectedDateFmt}` : 'בחר תאריך ×'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
