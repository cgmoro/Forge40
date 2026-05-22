# Forge40 — Design Decisions Log

This file captures decisions made during the visual design phase. Pass this to Claude Code alongside the prompt and program.json so nothing is lost in translation.

---

## Visual Direction

- **Locked palette:** Variant A — Dark Stone + Blood + Ember.
  - `--forge-black: #0a0a0b`
  - `--stone: #1c1b19`
  - `--iron: #2e2d2a`
  - `--bronze: #8b6f3f`
  - `--blood: #8b0000`
  - `--ember: #c9410b`
  - `--bone: #e8e2d5`
  - `--ash: #8a8680`
  - `--gold: #c9a24b` (Crown tier accent only)
- **Coach signature accents** (used in coach hero bottom border and avatar glow):
  - Sarge: `--blood: #8b0000`
  - Kai: `--ember: #c9410b`
  - Marcus: `--marcus: #6b8a8a` (cool slate, distinct from heat palette)
- **Typography:**
  - Display: Cinzel (Google Fonts)
  - Body: Manrope
  - Numerics/mono: JetBrains Mono
- **Texture:** Subtle noise grain overlay on screen backgrounds (radial gradient dots, low opacity).
- **No emoji in UI copy. No exclamation points outside God-Level mode.**

---

## Reward Ladder (FINAL)

Four tiers, helm removed:

| Tier | Item | Threshold |
|------|------|-----------|
| 1 | Shield | 1 per workout (the unit) |
| 2 | Spear | 10 shields |
| 3 | Sword | 5 spears |
| 4 | Crown | 4 swords |

**Math check:** A Crown requires roughly 200 workouts (~33 weeks at 6/week). Intentional — Crown is a near-yearlong goal.

**Bonus shields:**
- +1 shield if workout rated intensity ≥ 8
- +3 shields for every 7 consecutive training days (streak bonus)

**Rank titles:**
- 0 shields → Initiate
- 1+ shield → Hoplite
- 1+ spear → Phalanx Leader
- 1+ sword → Strategos
- 1+ crown → Spartan King
- Prefix "Titan-touched" appended if any God-Level marks earned

**Titan track is parallel, not part of the main ladder.** Each God-Level workout earns 1 Titan Mark. Displayed in a separate fire-themed grid in the Trophy Hall. God-Level also awards +5 bonus shields and a big-bang completion animation.

---

## Trophy Hall

- **Layout:** Pyramid altar. Crown at top (narrowest card width), descending through Sword, Spear, Shield (widest). A subtle vertical center line runs through the altar.
- **Granularity:** Show counts + most recent earned items as small bronze dots. For shields with count > 10, show 10 dots + "+N" overflow text.
- **Rank banner sticky at top.** Shows current rank name, "Titan-touched" sub-line if applicable, and a progress bar to the next rank.
- **Recent Forge feed** at the bottom: last 5 events (shield earns, spear forges, Titan marks). Titan events highlighted in ember.

---

## God-Level Mode

Three-stage cinematic flow:

1. **Stage 1 — Locked countdown.** Shown when cooldown is active. Lock icon, "Sealed" eyebrow, "GOD-LEVEL" title, countdown card with D/H/MIN. Stoic quote at bottom.
2. **Stage 2 — Warning.** Pulsing red overlay, warning triangle icon, "YOU ARE ABOUT TO ENTER · GOD-LEVEL MODE." Stats row (45 MIN · MAX EFFORT). Body copy explaining the cost. "I UNDERSTAND" / "RETREAT" buttons.
3. **Stage 3 — Confirm.** Embers rising, final question ("What kind of man walks out of this room?"), "FORGE ME" / "NOT TODAY" buttons. Pulsing glow on primary CTA.
4. **Stage 4 — Explosion.** Triple shockwave + 12 outward particles + flash. After 1.5s the "FORGED" stamp reveals.

**Cooldown:** Once per 7 days, hard.

**God-Level button on home screen:** Compact button at the bottom. Pulses ember when gates are open, dim and shows countdown when sealed.

---

## Home Screen

**Hierarchy (decided):** Coach-led. Today's coach greets you at the top, workout card directly below.

**Context scope (decided):** Today only. No weekly or program-level summaries on the home screen. (Those live on Stats and Program pages.)

**Structure top to bottom:**
1. Status bar (brand on left, rank pill with Titan mark on right)
2. **Coach hero** — avatar, name, archetype, italic greeting in coach's voice. Bottom border accent in coach's signature color.
3. **Today's Forge card** — workout meta, title, duration, 3 quick-info tags, BEGIN CTA, scheduled time row
4. **Quote strip** — today's stoic quote with "Read more" link
5. **Two action tiles** — weight (today + trend, OR empty state if 48h+ stale) and this week's shields
6. **God-Level button** — full-width, pulsing if available, locked countdown if not
7. **Tab bar** — Home / Program / Trophies / Stats / Settings

### Home screen specifics (locked):

- **Coach avatar:** Real profile photos to be supplied by user. Letter monogram is placeholder only — remove before build.
- **Coach full name (e.g., "Master Sergeant Atticus Vance, Ret."):** Show **only during weeks 1 and 2**. From week 3 onward, only show coach's first name (Sarge, Kai, Marcus). The familiarity arc matters.
- **Workout card quick-info tags:** Use the three-tag summary (moves/rounds/finisher for KB; pace/zone/prompts for runs). Confirmed.
- **Weight tile logic:**
  - Default: show today's reading + trend arrow vs yesterday.
  - If no weight logged in last 48 hours: switch to "Tap to step on scale" empty state.
  - On a fresh morning where today's reading is missing but yesterday's exists: show yesterday's reading with timestamp ("YESTERDAY · 198.4 LB") until today's is logged, OR show empty state — TBD, default to the latter for now to encourage daily logging.

---

## Coaches (FINAL)

| Coach | Full name | Personality | Signature color | Leads |
|-------|-----------|-------------|-----------------|-------|
| Sarge | Master Sergeant Atticus Vance (Ret.) | Grizzled veteran, dry humor, military cadence | Blood (#8b0000) | Monday strength + Sunday grind |
| Kai | Kai Mercer | Sharp older brother, fast-talking, sarcastic | Ember (#c9410b) | Wednesday conditioning + Friday two-a-day |
| Marcus | Marcus Aurelio | Stoic philosopher-coach, quiet, deliberate | Slate (#6b8a8a) | Tuesday technical + Saturday long run |

Full coach profiles, signature phrases, and voice traits live in `program.json`.

---

## Open items for Workout Player design

These need to be decided when the workout player mockup is built next:

- How is mid-workout check-in surfaced? (Modal? Inline question banner? Audio prompt?)
- How are pre-workout energy and post-workout rating screens structured?
- What does the coach narration look like during a timed block — text on screen, or audio with minimal visual?
- How does the video link modal work — embedded player on top of the workout view, or full screen takeover?
- Pause behavior — full dim with a "Resume" button, or just freeze the timer?

---

## Workout Player (FINAL)

Seven states. Single main view per state. Audio + text for coach narration (audio toggleable, on by default; text always visible).

1. **Pre-workout energy check.** Standalone screen before the session starts. Coach quote frames the ask, 10-bar energy scale (1 = spent, 10 = loaded). Reading drives the substitution rules in `program.json`. Cannot be skipped — required before "Confirm · Begin."
2. **Warm-up running.** Top bar (close + workout label + audio toggle), progress strip, block header ("WARM-UP · MOVE 2 OF 3"), movement display with WATCH DEMO video link, timer, coach cue panel (signature color border = current coach), pause + next actions.
3. **Active set.** Same architecture as state 2 with intensity dial turned up: blood-tinted round banner ("ROUND 2 OF 4 · MOVE 3 OF 6"), timer renders in ember with glow.
4. **Rest between sets.** Same architecture as state 3 but cooled off: banner in Marcus slate, timer in slate, "Up Next" preview card.
5. **Mid-workout check-in (modal).** Triggered at the halfway point of the main block. Dims and blurs underlying state. Three options: Light / Right / Heavy. Each color-coded (slate / bronze / ember). Tap routes to substitution rules. Heavy modal interrupt is intentional — forces self-assessment.
6. **Finisher.** Same architecture, full ember treatment: banner with top/bottom ember lines, gradient progress bar, big glowing timer, ember-bordered coach cue, ember CTA.
7. **Post-workout rating (mandatory, two sliders).** Two interactive sliders only: Energy After and Intensity. Starting energy from pre-workout shows above as a non-interactive recap row ("STARTING ENERGY · LOGGED PRE-SESSION · 7 / 10"). Optional one-line note. Bronze stamp at top shows pending shield reward + intensity bonus condition ("+1 if you rate ≥ 8"). Cannot be skipped; workout not logged until submitted.

### Open clarifications for Claude Code:

- **Video link modal:** Open YouTube embed in an in-app modal (don't navigate away). Pause the workout timer while the modal is open.
- **Pause behavior:** Freeze the timer. Dim the screen slightly. Show a "Resume" button center. No full takeover.
- **Audio narration:** Uses Web Speech API (`SpeechSynthesisUtterance`) with a low pitch / slow rate for Sarge, faster for Kai, medium-low and measured for Marcus. Read out the coach cue text and the per-round narration from `program.json`. User can mute via the audio toggle in the top bar; state persists.
- **Energy substitution behavior:** The pre-workout energy reading is passed through the `energy_substitution_rules` block in `program.json`. The coach cue text and the round narration get filtered through the substitution layer before rendering.
- **Mandatory rating enforcement:** State 7 cannot be dismissed. If user closes the app mid-rating, restore to state 7 on next launch. Workout is in "pending rating" status until completed; doesn't earn shields until logged.

---

## Files to deliver to Claude Code

- `forge40_prompt.md` — the build prompt
- `program.json` — the 12-week program with three coaches
- `godmode-design.html` — Variant A
- `trophy-hall-v2.html` — 4-tier pyramid altar (final)
- `home-screen.html` — coach-led home with three day variants
- `workout-player.html` — 7-state workout player (final)
- `design-decisions.md` — this file (read alongside prompt)
