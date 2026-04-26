// TacticalMap.jsx — מפה טקטית SVG לנוהל קרב
// שטח אש 309ה | מחלקה ב׳
// focusSection: missionReceived | situationAssessment | plan | order | preparations | null
import { useEffect, useRef } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────
function opacity(active, full = 1, dim = 0.15) {
  return active ? full : dim
}

// ── arrow marker defs ─────────────────────────────────────────────────────────
function Defs() {
  return (
    <defs>
      <pattern id="tc-cliff" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#4b5563" strokeWidth="2" />
      </pattern>
      <filter id="tc-glow-red" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="tc-glow-blue" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="tc-glow-yellow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      {/* arrow heads */}
      {[
        { id: 'arr-blue',    fill: '#60a5fa' },
        { id: 'arr-blue-lg', fill: '#93c5fd' },
        { id: 'arr-gray',    fill: '#6b7280' },
        { id: 'arr-red',     fill: '#ef4444' },
        { id: 'arr-dashed',  fill: '#3b82f6' },
      ].map(m => (
        <marker key={m.id} id={m.id} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" fill={m.fill} />
        </marker>
      ))}
    </defs>
  )
}

// ── friendly unit box (NATO-ish rectangle with X for infantry) ────────────────
function FriendlyUnit({ cx, cy, w = 52, h = 22, label, sublabel, active }) {
  return (
    <g opacity={opacity(active)} filter={active ? 'url(#tc-glow-blue)' : undefined}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="2"
        fill="#1e3a5f" stroke="#3b82f6" strokeWidth={active ? 2 : 1.5} />
      {/* infantry X */}
      <line x1={cx - w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy + h / 2} stroke="#3b82f6" strokeWidth="0.8" opacity="0.6" />
      <line x1={cx + w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy + h / 2} stroke="#3b82f6" strokeWidth="0.8" opacity="0.6" />
      <text x={cx} y={cy + 3} fill={active ? '#bfdbfe' : '#93c5fd'} fontSize="8.5" fontWeight="bold" textAnchor="middle">{label}</text>
      {sublabel && (
        <text x={cx} y={cy + h / 2 + 9} fill="#6b7280" fontSize="7" textAnchor="middle">{sublabel}</text>
      )}
    </g>
  )
}

// ── enemy unit (red X diamond) ────────────────────────────────────────────────
function EnemyUnit({ cx, cy, r = 24, label, sublabel, active, main = false }) {
  return (
    <g opacity={opacity(active)} filter={active ? 'url(#tc-glow-red)' : undefined}>
      <polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill="#7f1d1d" stroke="#ef4444" strokeWidth={main ? 2.5 : 2}
      />
      <line x1={cx - r + 4} y1={cy - r + 4} x2={cx + r - 4} y2={cy + r - 4} stroke="#ef4444" strokeWidth="1.5" />
      <line x1={cx + r - 4} y1={cy - r + 4} x2={cx - r + 4} y2={cy + r - 4} stroke="#ef4444" strokeWidth="1.5" />
      <text x={cx} y={cy + r + 11} fill={active ? '#fca5a5' : '#f87171'} fontSize={main ? 10 : 9} fontWeight="bold" textAnchor="middle">{label}</text>
      {sublabel && (
        <text x={cx} y={cy + r + 21} fill="#9ca3af" fontSize="7.5" textAnchor="middle">{sublabel}</text>
      )}
    </g>
  )
}

// ── hazard triangle ───────────────────────────────────────────────────────────
function Hazard({ cx, cy, label, sublabel, active }) {
  return (
    <g opacity={opacity(active, 1, 0.2)} filter={active ? 'url(#tc-glow-yellow)' : undefined}>
      <polygon points={`${cx},${cy - 16} ${cx + 17},${cy + 10} ${cx - 17},${cy + 10}`}
        fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
      <text x={cx} y={cy + 7} fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle">!</text>
      {/* exclusion radius ring */}
      <circle cx={cx} cy={cy} r="24" fill="none" stroke="#f59e0b" strokeWidth="1"
        strokeDasharray="5,3" opacity="0.55" />
      <text x={cx} y={cy + 28} fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle">{label}</text>
      {sublabel && (
        <text x={cx} y={cy + 37} fill="#9ca3af" fontSize="7" textAnchor="middle">{sublabel}</text>
      )}
    </g>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function TacticalMap({ focusSection = null }) {
  const f = focusSection

  // what each section highlights
  const showEnemies  = !f || f === 'situationAssessment' || f === 'plan' || f === 'order'
  const showOwn      = !f || f === 'situationAssessment' || f === 'plan' || f === 'order' || f === 'missionReceived'
  const showHazards  = !f || f === 'situationAssessment'
  const showAxes     = !f || f === 'plan' || f === 'order'
  const glowEnemies  = f === 'situationAssessment'
  const glowOwn      = f === 'missionReceived' || f === 'situationAssessment'
  const glowAxes     = f === 'plan' || f === 'order'

  return (
    <div className="w-full relative select-none" style={{ aspectRatio: '16 / 9' }}>
      <svg
        viewBox="0 0 620 348"
        className="w-full h-full"
        style={{ fontFamily: '"Heebo", sans-serif' }}
      >
        <Defs />

        {/* ── background ── */}
        <rect width="620" height="348" fill="#0c1a0c" />

        {/* subtle grid */}
        {[1,2,3,4,5,6,7,8].map(i => (
          <line key={`vg${i}`} x1={i*70} y1="0" x2={i*70} y2="348" stroke="#13231a" strokeWidth="0.5" />
        ))}
        {[1,2,3,4].map(i => (
          <line key={`hg${i}`} x1="0" y1={i*70} x2="620" y2={i*70} stroke="#13231a" strokeWidth="0.5" />
        ))}

        {/* ── CLIFF / NORTHERN LIMIT (top) ── */}
        <rect x="0" y="0" width="620" height="55" fill="url(#tc-cliff)" opacity="0.35" />
        <line x1="0" y1="55" x2="620" y2="55" stroke="#6b5c2e" strokeWidth="2.5" strokeDasharray="10,5" />
        <text x="12" y="22" fill="#78716c" fontSize="8.5" fontStyle="italic">— שפת מצוק | גבול צפוני מוחלט —</text>
        <text x="12" y="34" fill="#57534e" fontSize="7.5">איסור תנועה וירי מעבר לקו</text>

        {/* ── POWER LINE (right side, vertical dashed) ── */}
        <line x1="505" y1="0" x2="505" y2="348" stroke="#ca8a04" strokeWidth="1"
          strokeDasharray="14,7" opacity="0.4" />
        <text x="510" y="70" fill="#a16207" fontSize="7.5" opacity="0.7"
          transform="rotate(90 510 70)">קו מתח 161KV</text>

        {/* ── ENEMY FORCES ── */}
        {/* Target A — first objective, left */}
        <EnemyUnit cx={158} cy={138} r={22} label="יעד א׳" sublabel="בטונדה מערבית"
          active={showEnemies && glowEnemies} />

        {/* Target B — main objective, center */}
        <EnemyUnit cx={295} cy={85} r={26} label="יעד ב׳" sublabel="מטרה עיקרית" main
          active={showEnemies && glowEnemies} />

        {/* ── HAZARDS ── */}
        {/* Water pit */}
        <Hazard cx={370} cy={192} label="בור מים" sublabel="רדיוס איסור 25מ׳"
          active={showHazards} />

        {/* ── FRIENDLY — FIRE POSITION A (כיתה ב׳ covering) ── */}
        <FriendlyUnit cx={88} cy={248} w={70} h={26} label="כיתה ב׳" sublabel="ע.י.ב. א׳ — כיסוי"
          active={showOwn && (glowOwn || glowAxes)} />

        {/* Covering fire sector arc from fire pos → Target A */}
        <path d="M 122,237 Q 148,185 136,160"
          fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="7,4"
          markerEnd="url(#arr-dashed)"
          opacity={opacity(showAxes, 0.6, 0.08)} />

        {/* ── FRIENDLY — ASSEMBLY AREA (all forces) ── */}
        <g opacity={opacity(showOwn)}>
          <rect x="218" y="295" width="154" height="42" rx="4"
            fill="#14532d" stroke="#22c55e" strokeWidth={glowOwn ? 2.5 : 1.5} />
          <text x="295" y="312" fill="#86efac" fontSize="10" fontWeight="bold" textAnchor="middle">אזור כינוס</text>
          <text x="295" y="323" fill="#4ade80" fontSize="8" textAnchor="middle">מחלקה ב׳ | 30 לוחמים</text>
          <text x="295" y="333" fill="#86efac" fontSize="7.5" textAnchor="middle">כיתות א׳ · ב׳ · ג׳</text>
        </g>

        {/* ── MOVEMENT AXES ── */}

        {/* Phase 2 — all forces north (approach) */}
        <line x1="295" y1="295" x2="295" y2="255"
          stroke="#6b7280" strokeWidth="3" markerEnd="url(#arr-gray)"
          opacity={opacity(showAxes, 0.8, 0.12)} />
        <text x="304" y="282" fill="#9ca3af" fontSize="7.5"
          opacity={opacity(showAxes, 0.9, 0.08)}>ציר ראשי — שלב ב׳</text>

        {/* Phase 2 split — kita B breaks left to fire position */}
        <path d="M 272,256 L 124,248"
          fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arr-blue)"
          opacity={opacity(showAxes, 0.85, 0.1)} />

        {/* Phase 4 — kita A+G assault axis → Target A */}
        <path d="M 316,252 L 178,160"
          fill="none" stroke="#93c5fd" strokeWidth="3" markerEnd="url(#arr-blue-lg)"
          opacity={opacity(showAxes, 1, 0.12)} />
        <text
          x="255" y="212" fill="#93c5fd" fontSize="8.5" fontWeight="bold"
          textAnchor="middle" opacity={opacity(showAxes, 1, 0.08)}
          transform="rotate(-40 255 212)">
          כיתות א׳+ג׳ — שלב ד׳
        </text>

        {/* Phase 5 — after securing Target A → assault Target B */}
        <path d="M 178,115 L 265,88"
          fill="none" stroke="#93c5fd" strokeWidth="2.5" markerEnd="url(#arr-blue-lg)"
          opacity={opacity(showAxes, 0.9, 0.1)} />
        <text x="220" y="96" fill="#93c5fd" fontSize="8" opacity={opacity(showAxes, 0.9, 0.08)}
          transform="rotate(-18 220 96)">שלב ה׳</text>

        {/* Commander position (M"M with kita A) */}
        <g opacity={opacity(showOwn, 0.9)}>
          <circle cx="336" cy="208" r="7" fill="#92400e" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="346" y="212" fill="#fbbf24" fontSize="8" fontWeight="bold">מ"מ</text>
        </g>

        {/* ── COORDINATE LABELS ── */}
        <text x="8" y="342" fill="#374151" fontSize="7">GRID 309H · UTM 36S · סינתטי לצרכי הדמו</text>

        {/* ── NORTH ARROW ── */}
        <g transform="translate(584,32)">
          <circle cx="0" cy="0" r="20" fill="#111a11" stroke="#374151" strokeWidth="1.2" />
          <polygon points="0,-15 -4,7 0,3 4,7" fill="white" />
          <polygon points="0,15 -4,-7 0,-3 4,-7" fill="#374151" />
          <text x="0" y="-20" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">צ׳</text>
        </g>

        {/* ── SCALE BAR ── */}
        <g transform="translate(478,337)">
          <rect x="-2" y="-8" width="84" height="14" fill="#0c1a0c" opacity="0.7" />
          <line x1="0" y1="0" x2="80" y2="0" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="40" y1="-3" x2="40" y2="3" stroke="#6b7280" strokeWidth="1" />
          <line x1="80" y1="-4" x2="80" y2="4" stroke="#6b7280" strokeWidth="1.5" />
          <text x="20" y="-6" fill="#9ca3af" fontSize="6.5" textAnchor="middle">500מ׳</text>
          <text x="60" y="-6" fill="#9ca3af" fontSize="6.5" textAnchor="middle">500מ׳</text>
        </g>

        {/* ── LEGEND ── */}
        <g transform="translate(10,255)">
          <rect x="-4" y="-8" width="148" height="86" rx="4"
            fill="#080f08" stroke="#1e3a1e" strokeWidth="1" opacity="0.92" />

          {/* friendly */}
          <rect x="4" y="2" width="18" height="11" rx="1" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
          <line x1="4" y1="2" x2="22" y2="13" stroke="#3b82f6" strokeWidth="0.7" opacity="0.6" />
          <line x1="22" y1="2" x2="4" y2="13" stroke="#3b82f6" strokeWidth="0.7" opacity="0.6" />
          <text x="28" y="11" fill="#93c5fd" fontSize="8">כוח ידידותי</text>

          {/* enemy */}
          <polygon points="13,24 21,32 13,40 5,32" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
          <line x1="6" y1="25" x2="20" y2="39" stroke="#ef4444" strokeWidth="1" />
          <line x1="20" y1="25" x2="6" y2="39" stroke="#ef4444" strokeWidth="1" />
          <text x="28" y="36" fill="#fca5a5" fontSize="8">אויב מדומה</text>

          {/* hazard */}
          <polygon points="13,49 20,61 6,61" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
          <text x="28" y="59" fill="#fbbf24" fontSize="8">נת"ב / מפגע</text>

          {/* axis */}
          <line x1="4" y1="72" x2="20" y2="72" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arr-blue)" />
          <text x="28" y="75" fill="#93c5fd" fontSize="8">ציר תנועה</text>
        </g>

        {/* ── SECTION FOCUS LABEL (top right, shows what's highlighted) ── */}
        {f && (
          <g>
            <rect x="460" y="58" width="154" height="18" rx="3"
              fill="#0a1f0a" stroke="#166534" strokeWidth="1" />
            <text x="537" y="70" fill="#4ade80" fontSize="8" textAnchor="middle">
              {f === 'situationAssessment' && '🔍 הערכת מצב — אויב ומפגעים'}
              {f === 'plan'               && '📐 גיבוש תוכנית — צירי תנועה'}
              {f === 'order'              && '⚡ פקודה — ביצוע שלבי התרגיל'}
              {f === 'missionReceived'    && '📋 קבלת פקודה — כוחות ומשימה'}
              {f === 'preparations'       && '🕐 הכנות — אזור כינוס'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
