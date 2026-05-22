# Build: Forge40 — A Spartan Kettlebell PWA

## Mission

Build a Progressive Web App called **Forge40** for a 46-year-old intermediate kettlebell practitioner running a 12-week fat-loss and muscle-gain program. The aesthetic is unapologetically Spartan: dark stone, hammered iron, blood-red accents, sharp serif display type for headers, clean sans for body. Think bronze-age war meets modern training log. No rounded pastel UI. No emoji-driven cuteness. This is a forge, not a yoga app.

The user is a father and husband building discipline, resilience, and strength. The app's voice should reflect that: direct, earned, grounded in stoic philosophy. No motivational fluff. No "you got this!" Speak like Marcus Aurelius writing in his tent at night.

## Tech Stack

- **Framework:** React + Vite (PWA-enabled via `vite-plugin-pwa`)
- **Styling:** Tailwind CSS with a custom theme (see Design System below)
- **State / Storage:** IndexedDB via `idb` library for all user data (workouts, ratings, weight logs, rewards). LocalStorage only for lightweight prefs. Architect the data layer behind a `StorageAdapter` interface so a future Supabase/Firebase swap is a single-file change. The user plans to share this with friends later, so design for that.
- **Calendar Integration:** Google Calendar API via OAuth 2.0 (PKCE flow, no backend). Full read/write scope. Use `@react-oauth/google` or equivalent. Token refresh handled client-side; store tokens in IndexedDB (not localStorage).
- **Notifications:** Web Push API + Service Worker. Daily morning weight prompt, workout reminders, weekly check-in.
- **Animations:** Framer Motion for transitions, CSS for the explosion/forge effects.
- **Charts:** Recharts for weight trend and rating history.
- **Build target:** Installable PWA. Include in-app instructions for "Add to Home Screen" on iOS Safari and Android Chrome.

## Design System

**Palette:**
- `--forge-black: #0A0A0B` (primary background)
- `--stone: #1C1B19` (cards, surfaces)
- `--iron: #2E2D2A` (borders, dividers)
- `--bronze: #8B6F3F` (secondary accent, earned items)
- `--blood: #8B0000` (primary accent, CTAs, intensity)
- `--ember: #C9410B` (hover states, active workout)
- `--bone: #E8E2D5` (primary text)
- `--ash: #8A8680` (secondary text)
- `--gold: #C9A24B` (Crown tier, top achievements)

**Typography:**
- Headers: `Cinzel` or `Trajan Pro` (serif, carved-stone feel) — use Google Fonts Cinzel as the free alternative.
- Body: `Inter` or `Manrope`
- Numerics (timers, weight): `JetBrains Mono` for that engraved-data feel

**Texture:** Subtle noise/grain overlay on backgrounds. Hammered metal texture on tier badges. Avoid drop shadows; use inset borders and edge highlights instead.

**Tone of UI copy:** Short, declarative. "Begin." "Earned." "Today's forge." "Rest is also training." Never "Awesome job!" Never exclamation points except in God-level mode.

---

## Feature Spec

### 1. The 12-Week Program

Build a complete, hard-coded 12-week program for an **intermediate** practitioner with access to:
- 2x 20lb bells, 2x 25lb bells, 1x 50lb bell
- Variable dumbbell set
- Jump rope

**Weekly structure (5 training days, 6 sessions because one day is a two-a-day):**
- 4 kettlebell sessions (20-30 min)
- 2 running sessions (varied: one intervals/tempo, one long)
- 1 day is a double: KB + run

**Progression arc:**
- **Weeks 1-4 (Foundation):** Lower volume, classic patterns. Swings, goblet squats, presses, rows, Turkish get-ups. Runs are easy-to-moderate.
- **Weeks 5-8 (Build):** Add complexes, double-bell work, EMOMs. Introduce tempo runs and short intervals.
- **Weeks 9-12 (Forge):** Density work, snatches, heavy complexes, longer EMOMs. Threshold intervals and a long run that grows weekly.

Every workout has:
- Title (e.g., "Week 3, Day 2 — Iron Pressing")
- Duration target
- Warm-up block (2-3 min)
- Main block (sets, reps, time, weight cues)
- Finisher (optional, 2-4 min)
- Per-movement video link (YouTube short demo, ~30-60 sec ideal). For each kettlebell movement (swing, goblet squat, clean, press, snatch, TGU, halo, windmill, complex, etc.) and each run type, link a clean demo. Use links to reputable sources (StrongFirst, Kettlebell Kings, Onnit, or well-known coaches like Pat Flynn, Geoff Neupert, Eric Leija). **List every link in a `movements.json` data file** so the user can swap them easily. Include a placeholder if a link is uncertain and flag it in a `// REVIEW` comment.

Store the full 12-week program in a versioned `program.json` data file. Structure it so a v2 program can be dropped in later.

### 2. Calendar Integration (Google Calendar, Full Read/Write)

- OAuth on first launch. Store refresh token securely in IndexedDB.
- At the start of each week, prompt user to pick their preferred workout time window for the upcoming week ("Variable, set weekly"). Show a simple time picker (e.g., "Mon-Fri, 6:30 AM" or per-day overrides).
- App creates calendar events for each scheduled workout for the week, titled like `Forge40 — Week 3, Day 2 — Iron Pressing` with the workout details in the description.
- **Auto-reschedule logic:** Before each workout, check the calendar for conflicts. If a meeting now overlaps a scheduled workout, find the next open 30-min slot that day (or the next available day if none) and offer to move it with one tap. Never auto-move without confirmation.
- If a workout is missed, do NOT auto-skip the program. Offer to push the week forward or double up.

### 3. Workout Player

- Big bold display of current movement, sets/reps/time.
- Tap to advance. Auto-advance for timed blocks with audible cue (sharp gong or hammer strike, not a beep).
- Always-on screen during a workout.
- Video link is a small bronze icon next to each movement; opens in a modal (embedded YouTube player) without leaving the app.
- "Pause workout" pauses the timer and dims the screen.
- "End early" requires a confirmation ("Leave the field?"). Logged as incomplete.

### 4. Mandatory Post-Workout Rating

After every workout completes, **block forward navigation** until rated. Three sliders:
- **Energy starting** (1-10)
- **Energy after** (1-10)
- **Intensity of workout** (1-10)
- Optional one-line note

Store every rating. Surface trends in the dashboard.

### 5. Daily Weight Tracker

- Push notification every morning at user-set time (default 6:30 AM): "Step on the scale."
- Tap notification → quick entry screen, single field, big save button.
- Show trailing 7-day, 30-day, and 12-week trend chart on dashboard.
- Allow user to set an end-goal weight (or other goal: a target distance, a target set/rep, a target lift). One primary goal active at a time, plus optional secondary goals.

### 6. Weekly Check-In

Every Sunday evening, push notification: "The week's forge cools. Review."
Generates a weekly summary card with:
- Workouts completed / scheduled
- Average intensity
- Energy delta trend (did workouts leave you better or worse?)
- Weight change vs. goal
- Shields earned this week
- A coaching note for next week, generated from a rules-based engine (no LLM needed for v1):
  - If avg intensity ≥ 8 and energy-after trending down → "Pull back 10% next week. Recovery is the work."
  - If 5/5 completed and intensity ≤ 6 → "You have more to give. Step up the bells next week."
  - If 1-2 missed → "Discipline is the bridge between goals and accomplishment. Re-anchor your time blocks."
  - Etc. Build out ~10-15 rule combinations.

Design the rules engine in `coaching.ts` as a pure function so it's easy to extend later.

### 7. Stoic Wisdom Integration

**Two surfaces:**

**(a) Home screen quote of the day:** Pulled from a curated `wisdom.json` file. Each entry:
```json
{
  "id": "...",
  "quote": "...",
  "author": "Marcus Aurelius",
  "source": "Meditations, Book 5",
  "link": "https://...",
  "theme": "discipline" | "resilience" | "fatherhood" | "presence" | "self-mastery"
}
```
Curate at least 60 entries spanning: Marcus Aurelius, Epictetus, Seneca, Cato, Musonius Rufus, plus historical figures (Lincoln, Churchill, Roosevelt, Frederick Douglass, Frankl, Jocko, etc.). Weight selection toward themes the user cares about: resilience, dedication, being a good man, husband, and father. Each quote with a "Read more" link to a reputable source (Daily Stoic, Wikisource, Standard Ebooks, Letters from a Stoic on archive.org). Link verification: include `// REVIEW` for any uncertain link.

**(b) Pre-workout pop-up:** Before tapping "Begin," show a single short quote (one sentence ideal). Different from the home screen one. Tap-through dismisses.

Build the quote rotation as a deterministic-by-date function so the same day always shows the same quote (no surprises across reloads).

### 8. The Reward System (Gamification)

**Five-tier ladder:**

| Tier | Item | Shields needed | Visual |
|------|------|----------------|--------|
| 1 | Shield | per-workout unit | Bronze hoplite shield |
| 2 | Spear | 10 shields = 1 spear | Iron spear |
| 3 | Helm | 5 spears = 1 helm | Corinthian helmet |
| 4 | Sword | 4 helms = 1 sword | Xiphos blade |
| 5 | Crown | 3 swords = 1 crown | Laurel/gold |

**How shields are earned:**
- **Completion:** 1 shield per workout finished + rated.
- **Intensity bonus:** Workout rated intensity ≥ 8 → +1 bonus shield.
- **Streak bonus:** Every 7 consecutive training days (no missed scheduled session) → +3 bonus shields.
- **God-level bonuses (all three apply):**
  - Big-bang animation on completion
  - +5 bonus shields (above and beyond normal earning)
  - Permanent **Titan** badge in a separate Titan track (each God-level workout earned = one Titan mark; these never roll up into the main ladder, they're parallel achievements)

**Trophy Hall:**
- Dedicated page. Top of page: large display of current rank with item count (e.g., "Phalanx Leader — 2 Helms, 3 Spears, 4 Shields").
- Below: full visual hall showing every item ever earned, arranged by tier. Animated "earned" stamps with date.
- Titan track shown separately as a wall of fire-marked tiles.

**Rank titles (display alongside item count):**
- 0 shields: **Initiate**
- 1+ shields: **Hoplite**
- 1+ spear: **Phalanx Leader**
- 1+ helm: **Captain**
- 1+ sword: **Strategos**
- 1+ crown: **Spartan King**
- 1+ Titan mark (parallel): adds prefix **"Titan-touched"** to current rank.

### 9. God-Level Mode

A separate button on the home screen, styled distinctly: dark with embers and a slow pulse. Locked behind: "Once per 7 days."

Tap → cinematic confirmation screen:
- Full-screen takeover
- Animated fire/spark particle background
- Heavy serif text: "GOD-LEVEL. 45 minutes. Max effort. No retreat."
- Two buttons: "FORGE ME" (blood red, large) and "Not today" (small, gray)

On confirm:
- Explosion animation (CSS keyframe burst of particles, screen flash, deep gong sound)
- Replaces today's scheduled workout
- Calendar event is updated to "Forge40 — GOD-LEVEL"
- Workout is 45 minutes, AMRAP-style or heavy complex (build 5-7 different God-level workouts that randomize on each use, all designed for max effort with the equipment listed)
- On completion: another explosion, "Titan-touched" stamp animation, shields awarded.

Lock-out: after use, the button is replaced with a countdown to the next eligibility ("4 days, 11 hours until the gates open").

### 10. Push Notifications

- Workout reminder 30 min before scheduled time
- Daily weight prompt (user-set time, default 6:30 AM)
- Weekly check-in (Sunday 7 PM)
- Streak warning ("One day from a 14-day streak. Don't drop the line.")

Use the Web Push API. Walk the user through enabling notifications on first launch. Include a fallback for iOS where Web Push has historically been limited (it works on iOS 16.4+ when installed to home screen).

### 11. Onboarding

First-launch flow:
1. Splash: "Forge40. This is 40, forged."
2. Connect Google Calendar (skippable, can do later)
3. Enable notifications
4. Enter starting weight, end-goal weight (or other primary goal)
5. Pick week 1 workout times
6. "Add to Home Screen" instructions (detect platform, show iOS vs Android steps with screenshots/diagrams)
7. First quote: Marcus Aurelius — "Waste no more time arguing what a good man should be. Be one."
8. Land on home screen.

### 12. Home Screen Layout

- Top: current rank + shield count (small, top-right)
- Center hero: Today's workout card (or "Rest day. Recover deliberately.")
- Beneath hero: quote of the day with "Read more" link
- Bottom row: God-Level button + Weight log shortcut + Trophy Hall shortcut
- Tab bar at bottom: Home / Program / Trophies / Stats / Settings

### 13. Stats Page

- Weight trend chart (7d/30d/12w toggle)
- Energy delta over time
- Avg intensity per week
- Total volume estimate (rough: workouts × intensity)
- Goal progress bar
- Streak counter

---

## Data Files To Generate

1. `program.json` — full 12-week program (84 days, ~60 workouts).
2. `movements.json` — every kettlebell and running movement with video link.
3. `wisdom.json` — 60+ curated quotes with sources and "read more" links.
4. `godmode.json` — 5-7 God-level workout templates.
5. `coaching-rules.json` — weekly check-in rule combinations.

For any external links you're not 100% sure exist, add a `"// REVIEW": true` flag in the JSON and list them at the end of the build in a `LINKS_TO_VERIFY.md` file so the user can spot-check them.

---

## Code Structure

```
/src
  /components       (UI components)
  /screens          (Home, Workout, Trophy, Stats, Settings, Onboarding)
  /lib
    storage.ts      (StorageAdapter interface + IndexedDB impl)
    calendar.ts     (Google Calendar wrapper)
    notifications.ts
    rewards.ts      (shield/tier calculation logic)
    coaching.ts     (weekly rules engine)
    program.ts      (program loader and progression logic)
  /data
    program.json
    movements.json
    wisdom.json
    godmode.json
    coaching-rules.json
  /styles
    theme.css
  /service-worker
    sw.ts
```

Write clean TypeScript. Document each module with a brief header comment. Build with a clear separation between data (JSON), logic (lib), and presentation (components/screens) so the user (a general counsel who codes some) can edit content without touching logic.

---

## Build Order

1. Scaffold Vite + React + TS + Tailwind + PWA plugin.
2. Theme system and base layout.
3. Storage layer with IndexedDB adapter behind interface.
4. Data files (program, movements, wisdom, godmode, coaching).
5. Onboarding flow.
6. Home screen with quote + today's workout card.
7. Workout player with mandatory rating.
8. Reward calculation and trophy hall.
9. Calendar integration (OAuth + event create + conflict check).
10. Weight tracking + daily prompt.
11. God-level mode with animations and cooldown.
12. Stats dashboard.
13. Weekly check-in with coaching rules.
14. Push notifications and service worker polish.
15. Install-to-home-screen instructions screen.

After each major step, run a quick smoke test and report what's working before moving on.

---

## Tone Reminders

- No exclamation points outside God-level mode.
- No emoji in UI copy.
- No "you got this." Speak like Marcus Aurelius. "The impediment to action advances action. What stands in the way becomes the way."
- The app is a forge. The user is the iron.

Begin.
