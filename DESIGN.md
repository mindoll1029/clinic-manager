---
name: 보건실 침대 현황
description: A nurse-station magnet board for school sick-bay beds, shared live by the nurse PC, the student tablet and the support office.
colors:
  magnet: "#ffd84d"
  magnet-edge: "#d4ac25"
  magnet-ink: "#231f0e"
  magnet-ink-2: "#574812"
  magnet-hover: "#ffcf1f"
  magnet-tint: "#fffbea"
  row-active: "#fff9dc"
  over: "#c62d24"
  over-deep: "#9e2019"
  over-ink: "#ffffff"
  over-ink-2: "#ffe6e2"
  over-soft: "#fbe9e7"
  live: "#2f9e62"
  focus: "#0e5fd8"
  focus-on-frame: "#ffd84d"
  frame: "#263035"
  frame-2: "#313d43"
  frame-deep: "#11181c"
  frame-line: "#46535a"
  frame-ink: "#f2f5f4"
  frame-ink-2: "#b4bfc3"
  board: "#f2f4f3"
  board-rim: "#cfd5d8"
  paper: "#ffffff"
  rule: "#c9cfd2"
  rule-strong: "#8f9aa0"
  ink: "#172025"
  ink-2: "#47535a"
  ink-3: "#5c686e"
  slot-no: "#7d878c"
  busy: "#e3e7e8"
  row-hover: "#f8f9f8"
  shade: "rgba(23, 32, 37, 0.55)"
typography:
  display:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 54px)"
    fontWeight: 800
    lineHeight: 1.22
    letterSpacing: "-0.02em"
  elapsed:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "clamp(40px, 3.4vw, 56px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
  slot-number:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.04em"
  count:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "'tnum'"
  headline:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  tag-name:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  label:
    fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  radius: "10px"
  row: "12px"
  slot: "14px"
  radius-lg: "16px"
  sheet: "18px"
  stage: "20px"
  pill: "999px"
spacing:
  tight: "8px"
  row: "12px"
  slot-gap: "16px"
  panel-gap: "20px"
  zone-gutter: "28px"
components:
  button-primary:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.frame-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.frame-deep}"
  button-ghost:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.over}"
    textColor: "{colors.over-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 18px"
    height: "48px"
  button-danger-hover:
    backgroundColor: "{colors.over-deep}"
  button-xl:
    rounded: "{rounded.slot}"
    padding: "0 32px"
    height: "72px"
  scan-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    height: "52px"
  scan-button:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.magnet-ink}"
    height: "52px"
  scan-button-hover:
    backgroundColor: "{colors.magnet-hover}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.radius}"
    padding: "0 14px"
    height: "48px"
  tab:
    textColor: "{colors.frame-ink-2}"
    rounded: "{rounded.radius}"
    padding: "0 16px"
    height: "48px"
  tab-hover:
    backgroundColor: "{colors.frame-2}"
    textColor: "{colors.frame-ink}"
  tab-selected:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.magnet-ink}"
  magnet-tag:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.magnet-ink}"
    rounded: "{rounded.radius}"
    padding: "16px 18px 14px"
  magnet-tag-over:
    backgroundColor: "{colors.over}"
    textColor: "{colors.over-ink}"
  slot:
    rounded: "{rounded.slot}"
    padding: "8px"
  chip-extension:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.magnet}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip-over:
    backgroundColor: "{colors.over}"
    textColor: "{colors.over-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  status-active:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.magnet-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slot}"
    padding: "24px 26px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    width: "560px"
  toast:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.frame-ink}"
    rounded: "{rounded.row}"
    padding: "14px 20px"
  toast-error:
    backgroundColor: "{colors.over}"
    textColor: "{colors.over-ink}"
  kiosk-key:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius-lg}"
    width: "104px"
    height: "88px"
  kiosk-key-pressed:
    backgroundColor: "{colors.magnet}"
  kiosk-bed-free:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius-lg}"
    padding: "14px 16px"
  kiosk-bed-busy:
    backgroundColor: "{colors.busy}"
    textColor: "{colors.ink-3}"
  kiosk-bed-picked:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.magnet-ink}"
---

# Design System: 보건실 침대 현황

## Overview

**Creative North Star: "The Nurse-Station Magnet Board"**

The whole product is one physical object seen from four desks: a graphite aluminium frame holding an enamel whiteboard, ruled into one slot per bed, with a flat yellow name-tag magnet stuck into every occupied slot. The nurse PC, the support office, the admin hub and the student tablet all show that board, or a sheet laid over it. Nothing is a metric about the room; the board is a picture of the room, 남학생 on the left and 여학생 on the right, slots in real room order, a bunk bed drawn as one frame holding two stacked slots.

The system is built to be read at a glance from across the room. Type is large and heavy (18px body, 24px on the tablet, elapsed time 40 to 56px in tabular numerals like marker on a board), density is low, and colour is spent only on state: yellow means a magnet is there or something is selected, red means the magnet has flipped to its overdue side, graphite is the frame and the primary action. Everything else is enamel white, paper white and slate ink, divided by 1px rules.

The confirmed rejection is the category default: a sidebar dashboard of KPI tiles over a grid of identical cards. State is carried by form as well as colour, so the board still reads with colour removed: a dashed slot is open, a solid magnet is occupied, a red face with a doubled border, a clock and the words "사용 시간 초과" is overdue.

**Key Characteristics:**
- One frame, one board: graphite shell, recessed enamel board well, paper panels and sheets on top.
- Yellow magnet tags for occupied beds; the red side of the magnet for overdue.
- Dashed means open, solid means taken.
- Heavy tabular numerals for time and counts; elapsed time is the largest text on a tag.
- Flat, 1px-ruled surfaces; only magnets and floating sheets cast shadows.
- Magnet motion: snap in, lift off, flip to red.
- Every colour is a `:root` token in `css/app.css`.

## Colors

A graphite-and-enamel neutral board carrying exactly two state colours, magnet yellow and overdue red, plus a green live dot and a blue focus ring.

### Primary
- **Magnet Yellow** (#ffd84d, `magnet`): the name-tag magnet on an occupied bed, the selected tab, the brand mark, the scan bar's 등록 button, the checked segment, the picked bed on the tablet, the lit keypad digit, the 사용 중 status pill, text selection, and the highlighter band under the student's name in tablet prompts. On the graphite frame it also colours the free-bed count.
- **Magnet Edge Ochre** (#d4ac25, `magnet-edge`): the magnet's physical lip (a 1 to 2px bottom edge), borders of checked and active yellow items, the separator dots inside a tag.
- **Tag Ink** (#231f0e, `magnet-ink`) and **Olive Tag Ink** (#574812, `magnet-ink-2`): primary and secondary text on yellow. Never use slate ink on a magnet.
- **Warm Hover Yellow** (#ffcf1f, `magnet-hover`): hover on yellow buttons.
- **Yellow Wash** (#fffbea, `magnet-tint`): hover on a free bed on the tablet.
- **Active Row Cream** (#fff9dc, `row-active`): a table row whose session is still in use.

### Secondary
- **Overdue Red** (#c62d24, `over`): the red side of the magnet, the topbar 초과 count, overdue chips and status pills, danger buttons, destructive menu items and icon buttons, field errors, the offline state, error toasts.
- **Deep Overdue Red** (#9e2019, `over-deep`): danger hover, the red magnet's lip, the extension chip on a red tag.
- **Red-Side White** (#ffffff, `over-ink`) and **Blush Ink** (#ffe6e2, `over-ink-2`): primary and secondary text on red; the white face of the inverted 연장 button on a red tag.
- **Overdue Wash** (#fbe9e7, `over-soft`): overdue table rows, the tablet error banner, the failure mark.

### Tertiary
- **Live Green** (#2f9e62, `live`): the 10px connection dot only.
- **Focus Blue** (#0e5fd8, `focus`): the 3px focus outline on light surfaces.
- **Frame Focus Yellow** (#ffd84d, `focus-on-frame`): the focus outline and scan-bar ring on the graphite frame, where blue would vanish.

### Neutral
- **Graphite Frame** (#263035, `frame`): the page background, top bar and tablet frame; also the fill of primary buttons, the tablet OK key, the 퇴실하기 choice, toasts and the extension chip.
- **Graphite Hover** (#313d43, `frame-2`) and **Pressed Graphite** (#11181c, `frame-deep`): hover on frame controls; pressed and hovered primary buttons.
- **Frame Seam** (#46535a, `frame-line`): dividers and outlines on the frame.
- **Frame Ink** (#f2f5f4, `frame-ink`) and **Brushed Silver Ink** (#b4bfc3, `frame-ink-2`): primary and secondary text on graphite.
- **Enamel White** (#f2f4f3, `board`): the board surface, sticky table headers, hover fill on light rows and menu items.
- **Board Rim** (#cfd5d8, `board-rim`): the 6px inset rim around every board.
- **Paper White** (#ffffff, `paper`): panels, sheets, inputs, tablet bed cells and keys.
- **Slot Rule** (#c9cfd2, `rule`) and **Strong Rule** (#8f9aa0, `rule-strong`): 1px slot outlines and dividers; input borders, dashed empty slots, bunk frames.
- **Marker Black** (#172025, `ink`), **Slate Ink** (#47535a, `ink-2`), **Muted Ink** (#5c686e, `ink-3`): text in three steps.
- **Painted Number Grey** (#7d878c, `slot-no`): the big bed numbers painted in each slot.
- **Occupied Grey** (#e3e7e8, `busy`): an occupied bed on the tablet, where names are masked.
- **Row Hover** (#f8f9f8, `row-hover`): table row hover.
- **Graphite Shade** (rgba(23, 32, 37, 0.55), `shade`): the dialog backdrop.

### Named Rules
**The Magnet Yellow Rule.** Yellow is the magnet: it marks an occupied bed, the current selection, the brand mark and the one action the frame is asking for. It never becomes a panel or board background.

**The Red Side Rule.** Red is the back of the magnet: overdue, destructive, error, offline. Overdue always arrives as red face plus clock icon plus words, never colour alone. Its single non-alarm use is the scanner beam on the tablet's scan mark, which imitates the scanner's laser.

**The Root-Token Rule.** Every colour lives in the `:root` block at the top of `css/app.css`, with derived tokens declared beside their parents; component rules and scripts reference tokens only. Recolouring the app means editing that block and nothing else.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, Apple SD Gothic Neo, Malgun Gothic / 맑은 고딕, system-ui)
**Body Font:** the same family
**Label/Mono Font:** none; numbers use the same family with tabular figures

**Character:** One Korean grotesque doing everything, with hierarchy built from weight and size: 400 for reading, 600 for quiet labels, 700 for controls, 800 for headings and numerals, 900 for the painted slot numbers. Tracking tightens as size grows, so big numerals sit dense like marker strokes.

The size tokens are `--fs-sm` 18px (the PRD reading floor; labels separate from body by weight and colour, not size), `--fs` 18px, `--fs-md` 20px, `--fs-lg` 24px and `--fs-xl` 32px; the display and numeral sizes above them are set per role.

### Hierarchy
- **Display** (800, clamp(36px, 4.4vw, 54px), 1.22, -0.02em): tablet prompts such as "학생증 바코드를 스캐너에 대 주세요" and "퇴실하겠습니까?". The bed-pick prompt drops to clamp(28px, 3vw, 38px).
- **Elapsed** (800, clamp(40px, 3.4vw, 56px), 1, -0.03em, tabular): elapsed time on a magnet; 36px on a bunk tier. Units (시간, 분) at 0.42em and 700.
- **Slot Number** (900, 64px, 1, -0.04em): the bed number painted in the slot's top-right corner; 44px on a bunk tier.
- **Count** (800, 40px, 1, tabular): the free-bed count on the frame; 44px on the tablet frame. Tablet digit cells use 52px, keypad keys 36px at 700.
- **Headline** (800, 32px, -0.02em): the login title.
- **Tag Name** (800, 30px, 1.15, -0.02em): the student's name on a magnet; 24px on a bunk tier.
- **Title** (800, 24px): zone heads (남학생 침대), panel and sheet heads, tablet zone labels and sub-prompts.
- **Body** (400, 18px, 1.5): all reading text and table cells; panel notes cap at 70ch, tablet sub-prompts at 36ch. The 20px step carries the brand name, empty-slot text and the scan input.
- **Button** (700, 18px, 1.2): buttons and chips; 18px small, 20px large, 24px extra large.
- **Label** (700, 18px): field labels, table headers, status pills on staff screens.

### Named Rules
**The Marker Numeral Rule.** Elapsed time is the largest text on a magnet, weight 800 with tabular figures and units at 0.42em so the digits carry the reading. Every counted number (free beds, digits, times in tables) uses tabular figures.

**The Kiosk 24 Rule.** On the student tablet no text, button or chip is smaller than 24px; prompts run 36 to 54px.

**The Whole-Word Rule.** Korean breaks between words (`word-break: keep-all`). On a magnet, the meta line is one phrase, "{등록 위치}이/가 HH:MM에 등록" (bunk tiers too), with no class; 학번 sits beside the name and the 연장 chip beside the bed number, bunk tiers included stay whole and are separated by a 14px gap, never a dot, so no line starts or ends with a separator.

## Layout

The shell fills the viewport height: a graphite top bar (min 84px, 12px 20px padding) and, below it, the board, inset 16px from the frame on the sides and bottom. Only the board scrolls, so its slots can share the remaining height.

The board view is two equal zones, 남학생 left and 여학생 right, split by a 1px rule with a 28px gutter either side. Each zone has a head (24px title and free count over a 1px rule) and a slot grid whose column count follows the bed count (up to 4 beds: 2 columns, up to 6: 3, more: 4) with 16px gaps; rows stretch to fill the zone. A bunk bed takes one grid cell and holds its upper and lower slots inside its own frame. The board itself pads 22px 28px.

Records, settings, roster and admin views lay paper panels on the same board, centred at a 1240px maximum with 20px between panels; forms auto-fill columns of at least 240px with 18px by 20px gaps. Dialogs are 560px sheets (980px when wide).

The tablet uses the same frame (76px top bar, 16px inset) around a single board stage (40px 48px padding) holding one centred step at a time. Its bed-pick step mirrors the staff board: two zones, a 24px gutter, bed cells sharing the height.

Breakpoints shed detail before structure: at 1640px the tab icons and the 남/여 split go; at 1380px the brand subtitle goes and the scan input narrows; at 1180px the two zones stack; at 760px slots go to one column, tabs become equal icon-only buttons, the shell scrolls as a page and the tablet stacks its keypad and zones.

### Named Rules
**The Whole-Slot Reflow Rule.** The board reflows by whole zones and whole slots only: drop a column, never shrink type or squeeze a magnet to make it fit.

**The Room-Order Rule.** Every board view, staff or tablet, keeps 남학생 on the left and 여학생 on the right, with beds in the room's real order.

## Elevation & Depth

A hybrid of flat ruled surfaces and a few physical depths. The board is recessed: a 6px inset rim draws it as a whiteboard set into its frame. On the board, panels, slots, tables, inputs and graphite or outline buttons are flat and separated by 1px rules. Only two kinds of object have height: magnets stuck on the board (a 1 to 2px same-hue lip under the face plus a soft drop) and layers floating over it (sheets and toasts). Shadow tints come from the `--shadow-magnet`, `--shadow-over` and `--shadow-float` tokens in `:root`, never from literals in component rules.

### Shadow Vocabulary
- **Board Rim** (`box-shadow: inset 0 0 0 6px var(--board-rim)`): the board view, the tablet stage, the login card.
- **Magnet Lift** (`box-shadow: 0 1px 0 var(--magnet-edge), 0 8px 16px -10px var(--shadow-magnet)`): a yellow tag on the board. Larger yellow marks scale it: login mark `0 1px 0, 0 10px 18px -10px`; picked tablet bed `0 2px 0, 0 18px 26px -14px`; done mark `0 2px 0, 0 20px 30px -18px`; scan mark `0 2px 0, 0 22px 32px -18px`.
- **Red Side Lift** (`box-shadow: 0 1px 0 var(--over-deep), 0 10px 18px -10px var(--shadow-over)`, with `outline: 2px solid var(--over); outline-offset: 4px`): the overdue tag; the outline draws the doubled border.
- **Magnet Lip** (`box-shadow: 0 1px 0 var(--magnet-edge)` or `0 2px 0`): yellow items that sit on the surface without lifting, such as a lit digit cell and the yellow 연장하기 choice.
- **Sheet Float** (`box-shadow: 0 30px 60px -20px var(--shadow-float)`): dialogs, over the Graphite Shade backdrop.
- **Toast Float** (`box-shadow: 0 14px 30px -12px var(--shadow-float)`): toasts.

### Named Rules
**The Only-Magnets-Lift Rule.** A shadow means the object is stuck onto the board or floats above it. Panels, slots, tables, inputs and graphite or outline buttons stay flat.

## Shapes

Gently rounded rectangles throughout, with radii that nest: the frame-to-board well is 16px, a slot 14px, the magnet inside it 10px; a bunk frame 16px holds 12px tier slots; the tablet stage 20px holds 18px bunk frames and 16px bed cells. Panels are 14px, sheets 18px, the login card 20px, tablet choice buttons 22px, the scan mark 28px. Pills (999px) are reserved for chips, status, the 초과 count and the overdue alert line; circles for the live dot, the tablet check badge and the done and fail marks. Only `--radius` (10px) and `--radius-lg` (16px) are tokens; the other steps are literals in the stylesheet.

### Named Rules
**The Dashed-Means-Open Rule.** A dashed 1px border marks something open or optional: an empty bed slot, a free bed in the picker and on the tablet, an optional digit cell, the file drop zone, a cancelled status. Occupied and fixed things are solid. The shape carries the state with colour removed.

**The Nested Corner Rule.** An inner shape's radius is always smaller than its container's.

**The One-Line Rule.** Every rule, border and divider is 1px (`--line`). Heavier strokes mean state: 2px for the overdue outline and checked rings, 3px for focus, the 6px inset rim for the board's edge.

## Components

### Buttons
Solid, square-shouldered and large: every button is a clear target, never a text link pretending.
- **Shape:** gently rounded (10px); 14px at extra large.
- **Sizes:** small 40px (16px text), default 48px (18px), large 56px (20px), extra large 72px (24px, 26px on the tablet). Icon buttons are 48px squares.
- **Primary:** Graphite Frame fill, Frame Ink text, 700, 0 18px padding. Hover Pressed Graphite; press nudges down 1px; disabled at 42% opacity.
- **Ghost:** transparent with a 1px Slate Ink outline and Marker Black text; hover fills with the `--press` token.
- **Quiet:** Slate Ink text underlined in Strong Rule at a 4px offset, for low-stakes actions like 여기에 등록.
- **Danger:** Overdue Red fill, white text, hover Deep Overdue Red; used only as the confirm button in destructive dialogs (퇴실 처리, 등록 취소).
- **On a magnet:** ghost outlines and text take Tag Ink. On the red side the primary inverts to a white face with red text and ghosts take a white outline.

**The Spaced Destructive Rule.** On a magnet the safe action (연장, filled) sits at the left; a spacer pushes 퇴실 (outline-only) and the ⋯ menu to the right edge. Destructive steps are confirmed in a sheet whose confirm button is the filled danger button.

### Chips
- **Style:** pills, 2px 10px padding, 18px 700. The extension chip ("연장 1회") is graphite with yellow text, deep red with white on a red tag. The overdue chip and the topbar 초과 count are red with white text and a clock icon.
- **Status (records table):** 16px pills with a 1px Strong Rule outline. 사용 중 is yellow with an ochre border; 초과 is a red fill with a clock icon; 취소 is dashed and muted; an automatically ended row is outlined in red.
- **Overdue alert line:** on a red tag, a white pill with red 800 text and a clock icon reading "사용 시간 초과".

### Cards / Containers
- **Corner Style:** panels 14px; menu items and table frames 12px.
- **Background:** Paper White on the Enamel White board.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Slot Rule; a danger panel takes a red border.
- **Internal Padding:** 24px 26px for panels, 18px below panel heads; menu items 10px 16px at 64px minimum height.
- **Tables:** sticky Enamel White header in 16px 700 Slate Ink, 12px 14px cells divided by 1px rules, Row Hover on hover, Active Row Cream for in-use rows, Overdue Wash for overdue rows, struck-through muted text for cancelled rows.

### Inputs / Fields
- **Style:** 48px minimum height, 0 14px padding, 1px Strong Rule border, 10px radius, Paper White, 18px text; the label sits above in 16px 700 Slate Ink with a 6px gap.
- **Focus:** a 3px Focus Blue outline flush to the field and a blue border.
- **Error / Disabled:** errors in 16px 700 red text below the field; disabled fields take the Enamel White fill and Slate Ink text.
- **Segmented choice:** 48px outlined options; the checked one turns yellow with an ochre border and 700 text.
- **Scan bar (on the frame):** a white 52px field with the scan icon, a 20px 600 input and the yellow 등록 button joined flush on the right (radius on the outer corners only). Focus rings the whole bar in 3px Frame Focus Yellow.

### Navigation
- **Top bar:** on the graphite frame, left to right: the brand (a 34px yellow rounded square holding the bed icon, the name in 20px 800), the free count (빈 침대, a 40px yellow numeral over the total), the 초과 count when present, the live status (a green dot, red with white text when disconnected), then the scan bar. Tabs, the alert-sound toggle and the account button sit on the right.
- **Tabs:** 48px, 0 16px, 18px 600 Brushed Silver Ink with an icon; hover lifts to Graphite Hover and Frame Ink; the selected tab is a yellow block in Tag Ink at 800. On narrow screens tabs share the width as icon-only buttons.
- **Account button:** 48px, outlined in Frame Seam, 16px text.
- **Admin bar:** when an admin opens another role's screen, a yellow strip above the top bar says which screen is being viewed and links back.
- **Offline:** a 3px red line along the bottom of the top bar.

### Magnet Tag (signature)
The name-tag magnet is the system's core object.
- **Face:** Magnet Yellow, 10px radius, 16px 18px 14px padding, the Magnet Lift shadow.
- **Content, top to bottom:** bed label in 18px 700 Olive Tag Ink (with the extension chip), the name in 30px 800, the meta line in 18px Olive Tag Ink, the elapsed time in heavy tabular numerals at the foot, the remaining time (남은 시간) in 18px, then the actions.
- **Overdue:** the face flips to Overdue Red with white and blush text, the slot's own border disappears and a 2px red outline at a 4px offset doubles the edge; the white "사용 시간 초과" alert pill with a clock appears and the remaining-time line reads how far over it is.
- **Bunk tier:** a compact grid with name and time on one row (24px name, 36px time), the alert on its own row, then meta and 44px actions; it sizes to its content.
- **Empty slot:** a dashed 1px Strong Rule frame with the painted bed number in its corner and "비어 있음" centred in 20px 600 Slate Ink; the quiet "여기에 등록" button appears on hover or focus (always visible on narrow screens).
- **Motion:** a new registration snaps in (0.46s on `--ease`, cubic-bezier(0.2, 0.9, 0.25, 1): it drops from 16px above with a slight tilt and 3.5% scale, overshoots 2px and settles); checkout lifts the magnet off (0.24s ease-in, rising 12px and fading); crossing the allowed time flips it to its red side (0.6s rotateY from -180deg). Every open screen plays the same move. With reduced motion all of it is off.

### Bunk Frame
One 1px Strong Rule frame (16px radius, 10px 8px 8px padding) labelled "2층 침대" with the bed icon, holding the upper slot above the lower slot, each a 12px tier slot with a 44px painted number.

### Tablet Controls
- **Scan mark:** a 168px yellow rounded square (28px) holding the 104px scan icon at a 1.6 stroke, with a red beam sweeping up and down every 2.4s (hidden with reduced motion).
- **Digit cells:** 76 x 92px paper cells, 14px radius, 52px 800 digits; a filled cell turns yellow with the Magnet Lip. Secret-code cells are 60 x 76px, with optional ones dashed.
- **Keypad:** 3 columns of 104 x 88px keys, 16px radius, 36px 700 digits, 12px gaps; a pressed key flashes yellow; the OK key is graphite with Frame Ink, turning yellow-on-black when pressed.
- **Bed picker:** a free bed is a paper cell with a dashed Slate Ink border; an occupied bed is solid Occupied Grey with Muted Ink and a masked name (김*준); the picked bed turns yellow, grows to 104% with the Magnet Lift and a 40px graphite check badge, while the other free beds recede to 55% opacity at 97% scale. The other gender's zone sits at 45% opacity.
- **Choice buttons:** 220px tall, 22px radius, a 52px icon over 34px 800 text and a 24px hint; 퇴실하기 is graphite, 연장하기 is yellow with the Magnet Lip.
- **Done and fail:** a 132px yellow circle with the check snaps in; an Overdue Wash circle with the red alert icon marks failure. A 280 x 6px graphite bar drains over 5 seconds before the tablet returns to the scan screen.
- **Highlighter:** the student's name in a tablet prompt sits on a yellow marker band covering the lower 38% of the line.

### Sheets and Toasts
- **Sheet:** Paper White, 18px radius, the Sheet Float shadow over Graphite Shade; it rises 10px into place in 0.22s. Head in 24px 800 with a close icon button; body 8px 26px 18px with 16px gaps; footer buttons right-aligned above a 1px rule.
- **Toast:** bottom centre, graphite with Frame Ink and a yellow icon, 12px radius, 14px 20px padding, the Toast Float shadow, rising 10px in 0.25s; error toasts are red with white.

### Icons
One inline SVG set on a 24px grid: 2px stroke, round caps and joins, no fill, `currentColor`, sized at 1.2em beside text. Large marks adjust the stroke (1.6 at 104px, 2.4 at 72px, 3 on the check badge).

## Do's and Don'ts

### Do:
- **Do** take every colour from the `:root` tokens in `css/app.css`, adding any new derived token beside its parent.
- **Do** show every bed state by form, colour and words together: dashed slot for free, solid yellow magnet for occupied, red face with the 2px offset outline, clock and "사용 시간 초과" for overdue.
- **Do** make elapsed time the largest text on a magnet (clamp(40px, 3.4vw, 56px), 800, tabular figures).
- **Do** keep reading text at 18px on staff screens and every text at 24px or more on the student tablet.
- **Do** keep 남학생 left and 여학생 right in room order on every board, with the bunk drawn as one frame holding two slots.
- **Do** nest corner radii, keep rules at 1px, and reserve heavier strokes for state.
- **Do** use the one 24px, 2px-stroke SVG icon set.
- **Do** play the magnet moves (snap in, lift off, flip) on every open screen, and switch them and the scanner beam off under reduced motion.

### Don't:
- **Don't** rebuild the board as a sidebar dashboard of KPI tiles and identical cards.
- **Don't** use red for anything but overdue, destructive, error and offline states (the tablet scanner beam is the one exception).
- **Don't** use yellow as a panel or board background or as decoration.
- **Don't** put shadows on panels, slots, tables, inputs, or graphite and outline buttons.
- **Don't** signal any state with colour alone.
- **Don't** place 퇴실 or any destructive action beside 연장 or give it a fill on the magnet.
- **Don't** shrink type to fit the board; drop a column instead.
- **Don't** write a literal colour in a component rule or in script markup.
