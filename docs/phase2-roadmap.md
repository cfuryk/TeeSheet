# Phase 2 Roadmap

Features planned for after the core Phase 1 app is stable and in use.

---

## Side Betting

### Overview
Add optional side games that can be attached to any round at creation time.

### Planned Games

**Skins**
- Each hole is worth a "skin" (or a dollar amount)
- The player with the lowest score on a hole wins the skin
- If two or more players tie, the skin carries over to the next hole
- Works for both gross and net rounds

**Nassau**
- Three separate bets: front 9, back 9, and overall 18
- Each bet is won by the player/team with the best score on that segment
- Press options (doubling the back or overall bet) optional in Phase 3

### Data Model Changes
- Add `sideGames: SideGame[]` array to round document
- Each `SideGame`: `{ type: 'skins' | 'nassau', betUnit: number }`
- Add `skinResults` and `nassauResults` to Round Summary page

---

## Golf Trips and Events

### Overview
An Event groups multiple rounds over one or more days (e.g. a weekend golf trip) and shows an aggregate leaderboard across all rounds.

### Data Model
New `events/{eventId}` collection:
```
eventId: string
name: string
description: string
rounds: string[]      // array of roundIds
golferIds: string[]   // all participants across all rounds
startDate: Timestamp
endDate: Timestamp
createdBy: string
status: active | completed
```

### Features
- Event leaderboard: sum of net/gross scores across all rounds in the event
- Individual round scores still trackable
- Event creation flow: create event, then add existing rounds to it

---

## Calculated Handicap (World Handicap System)

### Overview
Instead of requiring users to manually enter their handicap, compute it automatically from their round history stored in TeeSheet.

### WHS Formula
The handicap index is calculated from the best 8 of the last 20 score differentials.

**Score Differential for one round:**
```
differential = (113 / slope) × (grossScore - courseRating - adjustment)
```

Where `adjustment` = net double bogey adjustment (see WHS rules).

### Implementation Notes
- Store `scoreDifferential` on each completed scorecard
- Query last 20 completed scorecards for a golfer
- Apply WHS Calculation (average of best 8 × 0.96)
- Write result to `users.calculatedHandicap`
- Trigger calculation when a round is completed (Firestore trigger or client-side)

---

## Estimated Complexity

| Feature | Effort | Dependency |
|---|---|---|
| Skins game | Medium | Core round scoring (Phase 1) |
| Nassau | Medium | Skins |
| Events/trips | High | Multiple rounds exist |
| Calculated handicap | Medium | Many completed rounds exist |
