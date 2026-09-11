# FRONTEND SPECIFICATION
## Owner: Person 3 (React / Dashboard / Visualization)
## Project: SIH26143 — Oil Spill Detection & Vessel Attribution (Tier 1 MVP)

---

## 1. Your Role

You build the visual dashboard that displays the pipeline's output on a map. You consume ONE
endpoint from Person 2's Node.js backend and render everything from its response. You do not
call Person 1's Python service directly — you only ever talk to Person 2's Node.js API.

**Key advantage for you:** you can build almost this entire app before Person 1 or Person 2 are
done, by working against a static fixture file matching the exact schema below. Don't wait on them.

---

## 2. Tech Stack

- React (Create React App or Vite)
- `react-leaflet` + `leaflet` for the map (or Mapbox GL JS if the team prefers — Leaflet is
  simpler and free, recommended for hackathon speed)
- `axios` or native `fetch` for calling the backend
- Any component library you like for the sidebar/panels (or plain CSS — don't over-invest in
  styling before the app works)

**Run your dev server on port `3000`.**

---

## 3. Build Order

| Step | Task |
|---|---|
| 1 | Project scaffold: React app, routing (if needed — likely a single page for MVP), base layout with map area + sidebar |
| 2 | Create a static fixture file `mockPipelineResponse.json` using the EXACT schema in Section 4 below |
| 3 | Build the map component (Leaflet), centered on your team's chosen demo region |
| 4 | Render the spill detection polygon (`detection.polygon`) on the map as a filled shape |
| 5 | Render the origin probability area (`hindcast.origin_probability_area`) as a distinct shaded polygon (different color from detection) |
| 6 | Render the forward forecast path (`hindcast.forward_forecast_path`) as another distinct polygon/line |
| 7 | Render each ranked suspect vessel (`ranked_suspects[]`) as a map marker at `last_known_position`, sized or colored by `final_score` |
| 8 | Optionally render each suspect's `reachable_zone` polygon (toggle-able, this can get visually cluttered with multiple candidates) |
| 9 | Build the sidebar suspect list: table/list showing `vessel_name`, `mmsi`, `final_score`, `last_known_speed_knots`, `went_dark_hours_ago` — sorted by `final_score` descending |
| 10 | Build a simple input control: region/date selector, or a single "Run Demo Case" button if live input is too slow/unreliable for the actual presentation |
| 11 | Wire everything above to render from `mockPipelineResponse.json` first — get the ENTIRE UI working against fake-but-correctly-shaped data before touching the real API |
| 12 | Replace the fixture data source with a real `fetch('http://localhost:5000/api/run-pipeline', ...)` call once Person 2's service is ready |
| 13 | Add loading state (spinner while pipeline runs) and error state (show `message` field if `status: "error"`) |
| 14 | Final polish: legend for map colors, confidence display, responsive layout check |

---

## 4. API CONTRACT — What you consume (exact schema, do not deviate)

### `POST http://localhost:5000/api/run-pipeline`

**Request body you send:**
```json
{
  "region": { "min_lon": 72.5, "min_lat": 18.0, "max_lon": 73.5, "max_lat": 19.0 },
  "date": "2024-03-15"
}
```

**Response body you receive and must render:**
```json
{
  "run_id": "run_20240315_143000",
  "status": "success",
  "generated_at": "2024-03-15T14:35:00Z",
  "detection": {
    "detection_id": "det_20240315_001",
    "timestamp": "2024-03-15T14:30:00Z",
    "confidence": 0.87,
    "polygon": {
      "type": "Polygon",
      "coordinates": [[[72.61, 18.42], [72.63, 18.42], [72.63, 18.44], [72.61, 18.44], [72.61, 18.42]]]
    },
    "geometry": {
      "area_km2": 12.4,
      "perimeter_km": 15.2,
      "centroid": { "lon": 72.62, "lat": 18.43 },
      "aspect_ratio": 2.3,
      "compactness": 0.6
    }
  },
  "hindcast": {
    "origin_probability_area": {
      "type": "Polygon",
      "coordinates": [[[72.40, 18.20], [72.55, 18.20], [72.55, 18.35], [72.40, 18.35], [72.40, 18.20]]]
    },
    "estimated_origin_time_window": {
      "start": "2024-03-15T09:00:00Z",
      "end": "2024-03-15T11:00:00Z"
    },
    "forward_forecast_path": {
      "type": "Polygon",
      "coordinates": [[[72.65, 18.44], [72.90, 18.50], [72.95, 18.60], [72.70, 18.55], [72.65, 18.44]]]
    }
  },
  "ranked_suspects": [
    {
      "mmsi": "419001234",
      "vessel_name": "MV Example",
      "vessel_type": "Tanker",
      "last_known_position": { "lon": 72.45, "lat": 18.25 },
      "last_known_timestamp": "2024-03-15T08:15:00Z",
      "last_known_speed_knots": 14.2,
      "last_known_heading_deg": 90,
      "went_dark_hours_ago": 2.5,
      "reachable_zone": {
        "type": "Polygon",
        "coordinates": [[[72.44, 18.24], [72.56, 18.24], [72.56, 18.36], [72.44, 18.36], [72.44, 18.24]]]
      },
      "kinematic_score": 0.81,
      "proximity_score": 0.65,
      "size_match_score": 0.5,
      "final_score": 0.71
    }
  ]
}
```

**Error response you must handle:**
```json
{ "status": "error", "message": "Description of what failed", "failed_stage": "detection | hindcast | attribution" }
```
Show `message` to the user in a visible error state. Check `status` field first on every response
before trying to render `detection`/`hindcast`/`ranked_suspects` — they won't exist on error.

**Note:** GeoJSON coordinates are `[longitude, latitude]` order — Leaflet expects
`[latitude, longitude]` for most of its own APIs (e.g. `L.marker([lat, lon])`), so **you must swap
the order** when converting from the API response into Leaflet-friendly coordinates. This is the
single most common bug when wiring GeoJSON into Leaflet — double check it.

---

## 5. What You Do NOT Build

- No backend logic, no AIS processing, no scoring — you only render what Person 2 sends you.
- No direct calls to Person 1's Python service — always go through Person 2's Node.js API.

---

## 6. Integration Checklist

- [ ] Entire UI works correctly against the static fixture (Section 4 example) before touching
      the real API
- [ ] Correctly swaps `[lon, lat]` → `[lat, lon]` for every Leaflet render call
- [ ] Handles the `status: "error"` case gracefully with a visible message
- [ ] Successfully switched from fixture data to a real `fetch()` call to Person 2's running service
- [ ] Confirmed with a quick manual test: changing the input region/date and re-running produces
      visibly different results (if it doesn't, something upstream is still mocked — flag it)
- [ ] Loading state shown while the pipeline request is in flight (this can take a while with a
      real Monte Carlo hindcast run — don't let the UI look frozen/broken)

## 7. Demo-Day Safety

Ask Person 2 for their cached fallback JSON response (see `02-NODEJS-SPEC.md` Section "Handoff").
Keep a toggle or an easy code path to load this cached response instantly if the live pipeline is
too slow or something breaks live during judging — this is a real, previously-computed result, not
fake data, so using it as a fallback is honest and safe.
