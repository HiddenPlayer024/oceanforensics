# Project Progress & Handoff Document

## Current Status Overview
The `oceanforensics-frontend` project is in a highly advanced state. The UI has been completely redesigned with a **bioluminescent ocean dark theme** featuring glassmorphism panels, Space Mono monospace data display, animated glow effects, and a cinematic aesthetic. All functional requirements from `03-FRONTEND-SPEC.md` have been fulfilled. The application successfully consumes the complex GeoJSON fixture data and renders it interactively on a Leaflet map.

---

### Next Steps / Where We Left Off
All major frontend tasks are **complete**, including the live backend integration.

---

## What Was Done in This Session (2026-09-12)

### Bug Fix: Ranked Suspects Not Showing from Live Backend
- Added a `normaliseResponse()` function in `App.jsx` that defensively maps:
  - `raw.ranked_suspects ?? raw.suspects ?? []` — handles backend key name variants
  - `raw.hindcast ?? raw.hindcasting ?? null` — handles hindcast key variants
- This ensures the suspect list always populates regardless of minor backend key name differences.

### New Feature: Dual Region Selection Mode
- Added a segmented **mode toggle** in the Analysis Parameters panel:
  - **Named Destination mode**: Dropdown of preset named regions (Mumbai, Chennai, Kochi, Vizag, Gulf of Kutch)
  - **Coordinates mode**: Four individual `number` inputs for `min_lon`, `min_lat`, `max_lon`, `max_lat` with cyan monospace styling
- The `getRegionPayload()` function builds the correct bounding box object for either mode.

### UI Overhaul: Bioluminescent Ocean Theme
- `index.css`: Deep navy backgrounds (`#060c1a`), cyan/teal/purple accent palette, Google Fonts (Inter + Space Mono), custom scrollbars, CSS keyframe animations: `pulseGlow`, `fadeInUp`, `blink`, `rotateBorder`, `particleDrift`, `shimmer`
- `App.css`: Full redesign:
  - Glassmorphism sidebar with gradient top-bar line
  - Animated brand header with glowing logo icon
  - Live status pill with blinking dot
  - Panel sections with hover border glow
  - Segment-toggle region mode buttons
  - Cyan-styled coordinate inputs with Space Mono
  - Shimmer-sweep Run button with glow shadow
  - Score bar under each suspect card
  - Suspect cards with left-accent color bar (green/orange/red)
  - Map loading overlay with spinning ring
  - Map top banner showing analysis results
  - Redesigned legend with vessel score tier guide
  - Empty state with drifting satellite emoji
- `Chatbot.css`: Glassmorphism card, gradient avatar, cyan gradient title, `fadeInUp` message animation

---

## Detailed Specification Checklist (`03-FRONTEND-SPEC.md`)

| Step | Task | Status | Implementation Details |
|---|---|---|---|
| 1 | Project scaffold | **Done** | Vite + React. Modern dark layout established. |
| 2 | Create `mockPipelineResponse.json` | **Done** | Exact API contract schema followed. |
| 3 | Build the map component | **Done** | `react-leaflet` integrated. Centered on Mumbai demo region. |
| 4 | Render spill detection polygon | **Done** | Translucent red polygon with event handlers. |
| 5 | Render origin probability area | **Done** | Translucent orange polygon. |
| 6 | Render forward forecast path | **Done** | Dashed purple polygon. |
| 7 | Render ranked suspect markers | **Done** | Custom HTML `DivIcon`. Colored by `final_score`. |
| 8 | Render reachable zones (toggleable) | **Done** | Checkbox toggle in control panel. |
| 9 | Build sidebar suspect list | **Done** | Cards with score bar, detail grid, rank badge. |
| 10 | Input controls | **Done** | Named destination + raw coordinates dual mode. |
| 11 | Wire UI to mock data | **Done** | Flawlessly renders `mockPipelineResponse.json`. |
| **12** | **Real `fetch` to backend API** | **Done** | Live backend call implemented with Demo-Day fallback. |
| 13 | Loading & error states | **Done** | Map overlay spinner + error panel. |
| 14 | Final polish | **Done** | Legend with vessel tiers, map top banner, empty state. |

---

## Custom Enhancements Added
* **AI Chatbot Assistant (`src/Chatbot.jsx`)**: Collapsible AI chat with context-aware map interaction summaries.
* **`normaliseResponse()`**: Defensive key normalisation for live backend response variations.
* **Dual Region Mode**: Named destinations dropdown + raw lon/lat coordinate grid inputs.
* **Score Bars**: Animated progress bars on each suspect card.
* **Bioluminescent Ocean Theme**: Full `index.css` + `App.css` overhaul.

---
*Last Updated: 2026-09-12*
