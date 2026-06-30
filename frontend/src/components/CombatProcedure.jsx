// CombatProcedure.jsx — נוהל קרב
// RTL, Hebrew, military aesthetic, contentEditable fields, collapsible sections
import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronUp, Printer, Download, Pencil, Shield } from 'lucide-react'
import { COMBAT_PROCEDURE } from '../data/mockData'
import TacticalMap from './TacticalMap'

// ── utils ─────────────────────────────────────────────────
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// ── EditableField ─────────────────────────────────────────
function EditableField({ label, value, fieldId, sectionId, subsectionId, onUpdate }) {
  const ref = useRef(null)

  // sync external value updates (e.g. from fill_field tool)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value
    }
  }, [value])

  function handleBlur() {
    if (!ref.current) return
    const newVal = ref.current.textContent.trim()
    if (newVal !== value) {
      onUpdate({ sectionId, subsectionId, fieldId, value: newVal })
    }
  }

  return (
    <div className="mb-3">
      <div className="text-[11px] font-bold text-green-400 uppercase tracking-wider mb-1">{label}</div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        className="w-full bg-black/30 border border-green-800/50 rounded-lg px-3 py-2 text-sm text-gray-200 leading-relaxed focus:outline-none focus:border-green-500/70 focus:bg-black/50 transition-colors min-h-[36px] cursor-text"
        dir="rtl"
      >
        {value}
      </div>
    </div>
  )
}

// ── CollapsibleSection ────────────────────────────────────
function CollapsibleSection({ title, children, defaultOpen = true, onFocus }) {
  const [open, setOpen] = useState(defaultOpen)

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && onFocus) onFocus()
  }

  return (
    <div className="mb-4 border border-green-800/40 rounded-xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-green-950/60 hover:bg-green-950/80 transition-colors text-right"
      >
        <span className="font-bold text-green-300 text-sm">{title}</span>
        {open
          ? <ChevronUp size={16} className="text-green-500 flex-shrink-0" />
          : <ChevronDown size={16} className="text-green-500 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 py-3 bg-black/20">
          {children}
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────
export default function CombatProcedure() {
  const [data, setData] = useState(deepClone(COMBAT_PROCEDURE))
  const [toast, setToast] = useState(null)
  const [focusSection, setFocusSection] = useState(null)

  // expose update function for fill_field tool events
  const handleUpdate = useCallback(({ sectionId, subsectionId, fieldId, value }) => {
    setData(prev => {
      const next = deepClone(prev)
      const section = next.sections[sectionId]
      if (!section) return prev

      if (subsectionId && section.subsections) {
        const sub = section.subsections.find(s => s.id === subsectionId)
        if (sub) {
          const field = sub.fields.find(f => f.id === fieldId)
          if (field) field.value = value
        }
      } else if (section.fields) {
        const field = section.fields.find(f => f.id === fieldId)
        if (field) field.value = value
      }
      return next
    })
  }, [])

  // listen for fill_field events from SadanChat / Gemini tool
  useEffect(() => {
    function onFillField(e) {
      const { field_id, value, section } = e.detail || {}
      if (!field_id || !section) return
      handleUpdate({ sectionId: section, subsectionId: null, fieldId: field_id, value })
      setToast(`✅ שדה עודכן: ${field_id}`)
      setTimeout(() => setToast(null), 2500)
    }
    window.addEventListener('fillField', onFillField)
    return () => window.removeEventListener('fillField', onFillField)
  }, [handleUpdate])

  function handlePrint() { window.print() }

  function handleExport() {
    setToast('✅ מוריד PDF...')
    setTimeout(() => setToast(null), 2500)
  }

  const secs = data.sections

  return (
    <div
      className="h-full flex flex-col bg-[#0a1a0a] text-gray-200 overflow-hidden"
      dir="rtl"
      style={{ fontFamily: '"Heebo", sans-serif' }}
    >
      {/* ── header bar ── */}
      <div className="flex-shrink-0 bg-[#0d1f0d] border-b border-green-800/50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield size={17} className="text-green-400 flex-shrink-0" />
          <div>
            <div className="text-white font-bold text-xs leading-tight">{data.exercise}</div>
            <div className="text-green-400/70 text-[10px]">{data.commander} | {data.date}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-red-900/80 border border-red-500/50 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
            {data.classification}
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 bg-green-900/40 border border-green-700/50 rounded-lg text-green-300 hover:bg-green-800/50 text-[11px] transition-colors"
          >
            <Printer size={11} /> הדפס
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1 bg-green-900/40 border border-green-700/50 rounded-lg text-green-300 hover:bg-green-800/50 text-[11px] transition-colors"
          >
            <Download size={11} /> PDF
          </button>
        </div>
      </div>

      {/* ── two-column body — stacks on mobile (56% of 375px leaves ~165px for text,
          too narrow to read labels/values without wrapping mid-word) ── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* tactical map — full width on mobile (stacked above), fixed 56% column on desktop */}
        <div className="w-full md:w-[56%] h-36 md:h-auto flex-shrink-0 border-b md:border-b-0 md:border-l border-green-900/50 bg-[#090f09] flex items-center justify-center p-2">
          <TacticalMap focusSection={focusSection} />
        </div>

        {/* right — scrollable sections */}
        <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="px-4 py-3 space-y-1">

        {/* 1. קבלת פקודה */}
        <CollapsibleSection title="1. קבלת פקודה" onFocus={() => setFocusSection('missionReceived')}>
          {secs.missionReceived.fields.map(f => (
            <EditableField
              key={f.id}
              label={f.label}
              value={f.value}
              fieldId={f.id}
              sectionId="missionReceived"
              onUpdate={handleUpdate}
            />
          ))}
        </CollapsibleSection>

        {/* 2. הערכת מצב */}
        <CollapsibleSection title="2. הערכת מצב" onFocus={() => setFocusSection('situationAssessment')}>
          {secs.situationAssessment.fields.map(f => (
            <EditableField
              key={f.id}
              label={f.label}
              value={f.value}
              fieldId={f.id}
              sectionId="situationAssessment"
              onUpdate={handleUpdate}
            />
          ))}
        </CollapsibleSection>

        {/* 3. גיבוש תוכנית */}
        <CollapsibleSection title="3. גיבוש תוכנית" onFocus={() => setFocusSection('plan')}>
          {secs.plan.fields.map(f => (
            <EditableField
              key={f.id}
              label={f.label}
              value={f.value}
              fieldId={f.id}
              sectionId="plan"
              onUpdate={handleUpdate}
            />
          ))}
        </CollapsibleSection>

        {/* 4. פקודה — subsections */}
        <CollapsibleSection title="4. פקודה" onFocus={() => setFocusSection('order')}>
          {secs.order.subsections.map(sub => (
            <div key={sub.id} className="mb-4">
              <div className="text-green-500 font-bold text-xs uppercase tracking-wider mb-2 border-b border-green-800/30 pb-1">
                {sub.label}
              </div>
              {sub.fields.map(f => (
                <EditableField
                  key={f.id}
                  label={f.label}
                  value={f.value}
                  fieldId={f.id}
                  sectionId="order"
                  subsectionId={sub.id}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          ))}
        </CollapsibleSection>

        {/* 5. הכנות */}
        <CollapsibleSection title="5. הכנות" onFocus={() => setFocusSection('preparations')}>
          <div className="space-y-2">
            {secs.preparations.fields.map(f => (
              <div key={f.id} className="flex gap-3 items-start">
                <span className="text-green-400 font-bold text-xs w-10 flex-shrink-0 mt-2.5">{f.label}</span>
                <div className="flex-1">
                  <EditableField
                    label=""
                    value={f.value}
                    fieldId={f.id}
                    sectionId="preparations"
                    onUpdate={handleUpdate}
                  />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

          {/* edit hint */}
          <div className="px-1 pb-3 flex items-center gap-1.5 text-[10px] text-green-800">
            <Pencil size={10} />
            <span>לחץ על שדה לעריכה ישירה</span>
          </div>
        </div>{/* end scroll */}
        </div>{/* end right col */}
      </div>{/* end two-col */}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-800/90 border border-green-500/40 text-green-300 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}
