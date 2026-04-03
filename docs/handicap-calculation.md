# Handicap Calculation

## Course Handicap Formula

The course handicap converts a golfer's Handicap Index into a course-specific value that accounts for the difficulty of the specific tees being played.

```
courseHandicap = round( handicapIndex × (slope / 113) + (courseRating - coursePar) )
```

Where:
- `handicapIndex` — the golfer's USGA Handicap Index (stored in `users.handicap`)
- `slope` — the slope rating of the tees being played (from `tee.slope`)
- `113` — the slope of a "standard" course (USGA defined)
- `courseRating` — the rating of the tees (from `tee.rating`)
- `coursePar` — the par of the tees (from `tee.par`)

**Example:** Golfer with 18.0 index playing Blue tees (slope 130, rating 72.4, par 72):
```
courseHandicap = round(18.0 × (130/113) + (72.4 - 72))
              = round(18.0 × 1.1504 + 0.4)
              = round(20.71 + 0.4)
              = round(21.11)
              = 21
```

Implementation: `src/lib/handicap.ts` → `calculateCourseHandicap()`

---

## Stroke Allocation

Once the course handicap is known, we determine which holes the golfer receives a stroke on. This is based on each hole's **stroke index** (the `handicap` field on the hole object; 1 = hardest, 18 = easiest).

### Rules

| Course Handicap | Allocation |
|---|---|
| 0 | No strokes on any hole |
| 1–18 | One stroke on each hole where `strokeIndex <= courseHandicap` |
| 19–36 | One stroke on every hole, **plus** a second stroke on holes where `strokeIndex <= (courseHandicap - 18)` |
| Negative (plus handicap) | Minus one stroke on holes where `strokeIndex <= abs(courseHandicap)` |

**Example (Course Handicap 12):**
Golfer receives one stroke on the 12 hardest holes (stroke index 1 through 12).

**Example (Course Handicap 21):**
All 18 holes get 1 stroke. Additionally, the 3 hardest holes (stroke index 1, 2, 3) get a second stroke.

**Example (Course Handicap -2, plus handicap):**
The 2 hardest holes (stroke index 1 and 2) have their net score reduced by 1.

### Implementation

`src/lib/handicap.ts` → `buildStrokeAllocation(courseHandicap, holes)`

Returns `number[]` of length 18, where each element is the strokes allocated on that hole (0, 1, or 2; negative for plus handicaps). The array is ordered by hole number (index 0 = hole 1, index 17 = hole 18).

---

## When Is This Calculated?

Course handicap and stroke allocation are computed **at the moment the round is started** (when the creator clicks "Start Round"). This is done in `roundService.startRound()`:

1. Fetches the tee data (slope, rating, par, holes)
2. For each golfer: fetches their `users.handicap`
3. Calls `calculateCourseHandicap()` and `buildStrokeAllocation()`
4. Writes the results to `rounds/{roundId}/scorecards/{uid}` via batch write

This ensures handicaps are "locked in" at round start time and cannot be retroactively changed mid-round.

---

## Net Score Calculation

For each hole during a round:
```
netScore = grossScore - strokeAllocation[holeIndex]
```

This is computed client-side in `ScoreSelector` and written to Firestore alongside the gross score.
