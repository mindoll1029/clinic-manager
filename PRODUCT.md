# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Phase 1 (current): static HTML/CSS/JS prototype, no build step, opens from the file system. Data lives in the browser (localStorage) and syncs between tabs of the same browser (BroadcastChannel + storage events). All data access is isolated in one module (`js/store.js`) so it can be replaced later.

Phase 2 (only when the user asks): React + TypeScript + Vite + Supabase (Postgres, Auth, Realtime, Seoul region), deployed on Vercel, as recommended in the PRD.

## Users

- **보건 선생님 (school nurse):** at the 보건실 PC all day. Watches every bed, registers students directly, extends without a code, force-ends, moves, cancels, sees full names and records, changes settings.
- **학생 (students):** feeling unwell, standing at the tablet at the 보건실 entrance with a barcode scanner. Must register, extend (with a 관리번호) and check out with no instructions. Often in a hurry or unwell, so every step must be obvious.
- **학생지원실 근무자 (student support office staff, 강의동):** registers students before sending them to the 보건실, checks which beds are free, cancels mistaken registrations, uploads the student roster, views and exports records.
- **관리자 (administrator):** can open all three screens, manages accounts, passwords and operating settings.

## Product Purpose

Show the 보건실 bed status in real time on three screens at once (nurse PC, student tablet, support office), and manage bed registration. Success: registration in under 10 seconds from scan, changes visible on other screens within 2 seconds, students complete registration and checkout alone on first use.

## Operating Context

- Registration happens at the 학생지원실 (강의동) or on the student tablet at the 보건실. Input is a barcode scan of the student ID (scanner acts as a keyboard, sends digits + Enter) or typing the 학번.
- 학번 is a 4-digit number with no internal meaning: it starts at a fixed number and increases by 1 in admission order. It only identifies a student.
- After the scan the student picks a free bed. Usage time is fixed at 60 minutes.
- Beds are split into 남학생 (left) and 여학생 (right) zones.
- Extension: the student enters a 관리번호 on the tablet to add 60 minutes; the nurse extends with one button, no code. 5 wrong codes in a row lock extension for 1 minute.
- Checkout: the student scans or types the 학번 on the tablet and confirms "퇴실하겠습니까?". The bed disappears from all screens; the record is kept.
- A bed in use past its end time (the next 정각 after registration, KST, plus any extensions) turns red with a clock icon and a "사용 시간 초과" label. Colour is never the only signal.
- Each screen has a login; the account's role decides which screen opens. The admin account can reach every screen.

## Capabilities and Constraints

- Screens: 로그인, 관리자, 보건 선생님, 학생용 태블릿, 학생지원실.
- Student tablet: first screen is fixed to the scan screen; after the scan, the bed selection screen with the live bed table; completion screen returns to the scan screen after 5 seconds. Names are masked on the tablet (김*준).
- Support office screen: 학번 input + register button top left; bed list shows number, full name and elapsed time (no class on the board); 남학생 left, 여학생 right; overdue alert with its own sound toggle; no roster editing (the roster is loaded from Google Sheets on the admin screen); records and export.
- Nurse screen: empty-bed count, connection status and 학번 input top left; today's records and settings top right; bed cards in the real room order with [연장] [종료] and a more menu (move, cancel).
- No symptom or treatment data is collected.
- Undecided (see PRD section 10): meaning of 관리번호 (shared approval code is the working assumption), bed count and names, max extensions, record retention, cloud permission.

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
