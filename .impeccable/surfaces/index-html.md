---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: 보건실 침대 현황 웹앱 (all screens)

Scope: index.html single-page app with five screens (login, admin, nurse, kiosk, support). Visitor mode: Operate.

Audience and job: school nurse at the 보건실 PC watching and managing beds; students at the entrance tablet registering, extending, checking out; 학생지원실 staff in 강의동 registering and checking free beds; admin opening all screens.

Constraints: PRD-defined layouts per screen; 5 beds per zone (남 left, 여 right), each zone has one bunk bed (assumed: 3 single + bunk lower/upper = 5 spots); usage fixed at 60 min; red + clock + words at overdue; 학번 4 digits; colors will be changed later by the user, so every colour lives in :root tokens.

Unresolved: final palette (user will supply reference photos), meaning of 관리번호, bed layout confirmation.

## Direction contract

THESIS: The bed board is a nurse-station magnetic board: one slot per bed, a student is a flat magnet name tag stuck in the slot. Refuses the category default of a sidebar dashboard with KPI tiles and identical cards.

OWN-WORLD: Graphite aluminium frame as the shell (top bar, kiosk frame), enamel-white board ground with 1px slot rules, flat yellow name-tag magnets for occupied beds, red magnet with doubled border for overdue, dashed slot for empty, bunk beds drawn as one frame holding two stacked slots. Pretendard, heavy tabular numerals for elapsed time like marker on a board. Every colour is a :root token.

STORY: Anyone glancing at any screen knows within a second which beds are free, who is where, and who is overdue; staff act on a card without leaving the board; students scan, pick a bed, and leave.

FIRST VIEWPORT: Nurse: graphite top frame with brand, free-bed count (large numeral), live status, 학번 scan field + 등록 at top left; tabs 현황판/오늘 기록/설정 and account at top right. Below, the enamel board fills the viewport: 남학생 zone left, 여학생 zone right, each with its slots in room order, the bunk as a stacked pair; magnet tags show bed number with 연장 chip, name with 학번 beside it, elapsed time (largest text) and registration time (no class), and actions 연장 | gap | 퇴실, ⋯. Kiosk: graphite frame, scan prompt dominates centre.

FORM: magnet bed board, candidate 3 of 7 on the grounded list. seed:fc1dfb8605f7a835

Signature interaction: magnet snap. A new registration lands in its slot with a short drop-and-settle on every open screen; checkout lifts the magnet off; crossing the allowed time flips the magnet to its red side.

Raises: state by form as well as colour (emission rail); picked bed grows and others recede on the kiosk (streaming wall); one line weight throughout (centre rail); destructive actions spaced from extend and outline-only (console); one dominant region per screen (zoo map); board reflows by whole slots only (Crouwel).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
