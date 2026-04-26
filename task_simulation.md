# task_simulation.md — סימולציה טקטית: תוכנית שיפורים

> חוקי ברזל: לא נוגעים בפייפליין אודיו. לא משנים ארכיטקטורה ללא אישור מור.

---

## קל (CSS + React state)

- [x] **TASK-S01** — Pulsing markers on active units (CSS keyframe `simPulse` on active unit border)
- [x] **TASK-S02** — Phase title card animation (overlay with fade-in/slide when phase changes)
- [x] **TASK-S03** — Progress bar with phase milestone labels
- [x] **TASK-S04** — Unit trail lines — MapLibre GeoJSON LineString updated per phase (last 3 positions)
- [x] **TASK-S05** — Firing animation visual — animated dashed line flashing from ע.י.ב. to target (phases 3,4,6)
- [x] **TASK-S06** — HUD overlay — unit status panel (callsign, role, status: active/covering/assaulting)
- [x] **TASK-S07** — Explosion/impact effect on objective markers when assaulted (CSS animation + color change)
- [x] **TASK-S08** — Unit direction arrows — small SVG arrow on each marker pointing toward next position

---

## בינוני (logic + MapLibre animation)

- [x] **TASK-S09** — Phase transition narration auto-TTS (Web Speech API `speechSynthesis` in Hebrew — no external API)
- [x] **TASK-S10** — Cinematic camera sweep — smooth bearing + pitch change between phases
- [x] **TASK-S11** — Fog-of-war — gray overlay on assault areas that "clears" when units reach them
- [x] **TASK-S12** — SADAN phase summary popup — after each phase, floating card with key tactical data
- [x] **TASK-S13** — Fire sector lines — permanent translucent cone/wedge from ע.י.ב. position showing fire limits (phases 3–5)

---

## קשה (complex animation + special effects)

- [x] **TASK-S14** — Helicopter medevac animation — animated 🚁 marker flying from assembly area toward יעד א׳ and back (phase 5)
- [x] **TASK-S15** — Tank softening fire animation — 🪖 marker at assembly area, fires shell arc toward target before assault (phase 3→4 transition)
- [x] **TASK-S16** — Continuous smooth movement — `requestAnimationFrame` interpolation along route LineString for fluid unit movement
- [x] **TASK-S17** — Cinematic auto-pilot mode — camera slowly orbits the battle area while simulation plays, with cinematic easing

---

## הערות מימוש

- Trail lines: MapLibre source `setData()` per phase — store last 3 positions per unit
- Firing lines: separate MapLibre source `sim-fire-lines`, shown/hidden per phase
- Helicopter: custom marker created on phase 5 entry, animated via `setInterval` + `setLngLat()`
- Tank: custom marker + animated CSS "shell" div flying via `@keyframes`
- Speech: `window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))` — Hebrew `lang='he-IL'`
- Fog of war: MapLibre fill layer with high opacity, reduced on unit arrival
