# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Phase 1 (current): static HTML/CSS/JS prototype, no build step, opens from the file system. Data lives in the browser (localStorage) and syncs between tabs of the same browser (BroadcastChannel + storage events). All data access is isolated in one module (`js/store.js`) so it can be replaced later.

Phase 2 (only when the user asks): React + TypeScript + Vite + Supabase (Postgres, Auth, Realtime, Seoul region), deployed on Vercel, as recommended in the PRD.

## Users

- **보건 선생님 (school nurse):** at the 보건실 PC all day. Watches every bed, registers students directly, extends, force-ends, moves, cancels, sees full names and records, changes settings.
- **학생 (students):** feeling unwell, standing at the tablet at the 보건실 entrance with a barcode scanner. Must register and request checkout with no instructions (by scanning the student card or typing the 학번). Students never extend on a tablet. A second student tablet at the 학생지원실 registers (any time) and checks out directly (no extension). Often in a hurry or unwell, so every step must be obvious.
- **학생지원실 근무자 (student support office staff, 강의동):** registers students before sending them to the 보건실, extends at any time, confirms checkout when a student who requested it arrives (any time), checks which beds are free, cancels mistaken registrations, uploads the student roster, views and exports records. From 10 minutes before the nurse's end of duty (and whenever the nurse is off duty) also checks out students directly.
- **보건 조교 (nurse assistant):** own account on the 학생지원실 screen with the same permissions, except that extend and checkout work at any time, regardless of the nurse's duty schedule; records show "보건 조교" as the actor.
- **관리자 (administrator):** can open all three screens, manages accounts, passwords and operating settings.

## Product Purpose

Show the 보건실 bed status in real time on three screens at once (nurse PC, student tablet, support office), and manage bed registration. Success: registration in under 10 seconds from scan, changes visible on other screens within 2 seconds, students complete registration and checkout alone on first use.

## Operating Context

- Registration happens at the 학생지원실 (강의동) or on the student tablet at the 보건실. Input is a barcode scan of the student ID (scanner acts as a keyboard, sends digits + Enter) or typing the 학번.
- 학번 is a 4-digit number with no internal meaning: it starts at a fixed number and increases by 1 in admission order. It only identifies a student.
- After the scan the student picks a free bed. Usage time is fixed at 60 minutes.
- Beds are split into 남학생 (left) and 여학생 (right) zones.
- Extension: only on the nurse PC and the 학생지원실 PC (one button, adds 60 minutes, any time). Student tablets have no extension and there is no 관리번호. There is no maximum number of extensions.
- Checkout from the 보건실 is two steps. (1) The student scans or types the 학번 on the 보건실 tablet (at any time, also outside duty hours), answers "퇴실을 요청하겠습니까?" with 예, reads "학생지원실로 이동하세요" and presses 확인했어요; only then the bed shows "퇴실 중" with the minutes since the request on every screen. (2) At the 학생지원실 the student scans or types the 학번 on the 학생지원실 tablet and answers "퇴실하겠습니까?" with 예, or the staff press 퇴실 확인 on the PC (or scan the student card into the 학번 field); the bed then disappears and the record is kept. On the 학생지원실 tablet a student in use always checks out directly. A 퇴실 중 bed is never counted as overdue. After 10 minutes in 퇴실 중 without confirmation the card shows "퇴실 확인 안 됨" and one JANDI (잔디) message is sent through a Netlify function (settings → 잔디 알림 holds the incoming-webhook URL).
- A bed in use past its end time (the next 정각 after registration, KST, plus any extensions) turns red with a clock icon and a "사용 시간 초과" label. Colour is never the only signal.
- Each screen has a login; the account's role decides which screen opens. The admin account can reach every screen.
- Nurse duty schedule (settings → 근무 일정): weekly hours per weekday plus per-date changes (연차·조퇴). Default: Monday to Friday, 08:30 to 17:30. Outside duty hours the 보건실 tablet shows the live board and accepts checkout requests only (no register) and sends students to the 학생지원실; the 학생지원실 PC handles direct checkout from 10 minutes before the end of duty. After hours the 보건실 is patrolled once an hour (an operating rule, not tracked in the app).

## Capabilities and Constraints

- Screens: 로그인, 관리자, 보건 선생님, 보건실 학생용 태블릿 (#/kiosk), 학생지원실 학생용 태블릿 (#/office), 학생지원실.
- Student tablets (보건실, 학생지원실): first screen is the scan screen with a 학번 입력 keypad; a student not in use gets the bed selection screen with the live bed table; a student in use gets the checkout question directly; completion screen returns to the scan screen after 5 seconds. Names are masked on the tablet (김*준).
- Support office screen: 학번 input + register button top left; bed list shows number, full name and elapsed time (no class on the board); 남학생 left, 여학생 right; overdue alert with its own sound toggle; no roster editing (the roster is loaded from Google Sheets on the admin screen); records and export.
- Nurse screen: empty-bed count, connection status and 학번 input top left; today's records and settings top right; bed cards in the real room order with [연장] [종료] and a more menu (move, cancel).
- No symptom or treatment data is collected.
- Undecided (see PRD section 10): bed count and names, record retention, cloud permission.

## Brand Commitments

None. School-internal tool; Korean UI. Student-facing copy uses 해요체, one idea per sentence, errors say how to fix them. The user has set exact messages: "지금은 빈 침대가 없습니다.", "학번을 다시 확인해 주세요.", "퇴실하겠습니까?".

## Evidence on Hand

PRD: "보건실 침대 현황 관리 시스템 PRD" (claude.ai doc). No real student data; prototype uses clearly fictional sample names. No logos or school branding supplied; do not invent a school name or emblem.

## Product Principles

1. The bed board is the product: every screen answers "which bed is free, who is in which bed, for how long" before anything else.
2. One screen, one job for students: scan, pick a bed, done.
3. Overdue must be impossible to miss and impossible to misread (colour + icon + words).
4. Show only the personal data each role needs.
5. Keep data access in one place so the prototype can become the real system without rewriting screens.

## Accessibility & Inclusion

Minimum text 18px (tablet 24px), elapsed time 36px or larger, touch targets at least 56px, text contrast 4.5:1 or higher, state shown by colour + text + icon (colour-blind safe). The tablet must work without the on-screen keyboard (scanner or on-screen numeric keypad).
