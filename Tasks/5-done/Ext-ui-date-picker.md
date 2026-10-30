# Ext-ui-date-picker

- **ID:** T-0051
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · UI restyle of one component, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-date-picker/` · **Branch:** `feat/ui-date-picker`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/ui/src/components/ui/calendar.tsx, date-range-picker.tsx, index.css tokens (additive)

## Goal
Make the date range picker look like a modern web component (reference: `images/6.png`): clean popover card, light range band, rounded selected ends, normal-weight type, Clear and Apply buttons. Today (`images/5.png`) it is heavy, bold and saturated.

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (existing pass)  - [ ] G4 run it (quick)
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Popover card with border and soft shadow, two months, chevrons at the sides, centred semibold month titles, small grey weekday labels, 36-40 px day cells with normal weight numbers
- [ ] In-range days are a light neutral band with rounded row ends; start and end are filled with the primary colour and rounded; outside-month days muted; today has a subtle ring
- [ ] Footer: outline `Clear` and filled `Apply` (applies the range; closing the popover without Apply keeps the old range); trigger button is an outline button with a calendar icon and `Select date range` placeholder
- [ ] Keyboard works (arrows, Enter, Esc); looks right in light, dark and VS Code high-contrast; no new dependency
- [ ] Compared against `images/6.png` in Chrome at light and dark
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
