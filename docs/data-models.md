# Data Models

## Firestore Collections

### `users/{uid}`

One document per registered user, keyed by Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `uid` | `string` | Matches Firebase Auth UID |
| `displayName` | `string` | User's display name |
| `email` | `string` | Email address |
| `handicap` | `number` | User-entered handicap index (decimal, e.g. 14.2) |
| `calculatedHandicap` | `number \| null` | System-computed from round history (Phase 2) |
| `isAdmin` | `boolean` | Admin flag; default `false` |
| `createdAt` | `Timestamp` | Set on first profile creation |
| `updatedAt` | `Timestamp` | Updated on every write |

---

### `courses/{courseId}`

One document per golf course.

| Field | Type | Notes |
|---|---|---|
| `courseId` | `string` | Auto-generated Firestore ID |
| `name` | `string` | Course name |
| `createdBy` | `string` | UID of creator |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |
| `tees` | `Tee[]` | Embedded array of tee sets |

**Why embedded?** Tees and holes are always read together (when creating a round, displaying course info). The total data size for 4 tees × 18 holes × ~5 fields is well under Firestore's 1 MiB document limit.

#### Tee Object

| Field | Type | Notes |
|---|---|---|
| `teeId` | `string` | Client-generated UUID |
| `name` | `string` | e.g. "Blue", "White", "Red" |
| `par` | `number` | Total course par (typically 70–74) |
| `yardage` | `number` | Total course yardage |
| `slope` | `number` | USGA slope rating (55–155, par = 113) |
| `rating` | `number` | USGA course rating (decimal, e.g. 72.4) |
| `holes` | `Hole[]` | Array of exactly 18 hole objects |

#### Hole Object

| Field | Type | Notes |
|---|---|---|
| `number` | `number` | Hole number 1–18; must be unique within tee |
| `par` | `number` | 3, 4, or 5 |
| `yardage` | `number` | Hole yardage |
| `handicap` | `number` | Stroke index 1–18; must be unique within tee |

---

### `rounds/{roundId}`

One document per round.

| Field | Type | Notes |
|---|---|---|
| `roundId` | `string` | Auto-generated Firestore ID |
| `name` | `string` | e.g. "Saturday Morning" |
| `courseId` | `string` | FK → `courses` |
| `courseName` | `string` | Denormalized; avoids extra fetch in tee sheet |
| `teeId` | `string` | Which tee set for this round |
| `teeName` | `string` | Denormalized |
| `date` | `Timestamp` | Scheduled tee time |
| `roundType` | `string` | `STROKE_GROSS` / `STROKE_NET` / `BEST_BALL_GROSS` / `BEST_BALL_NET` |
| `isPrivate` | `boolean` | If true, hidden from public tee sheet |
| `createdBy` | `string` | UID |
| `status` | `string` | `pending` / `active` / `completed` |
| `golferIds` | `string[]` | UIDs of participants (max 4) |
| `teams` | `Team \| null` | Only populated for BEST_BALL types |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

#### Team Object (Best Ball only)

```json
{
  "teamA": ["uid1", "uid2"],
  "teamB": ["uid3", "uid4"]
}
```

---

### `rounds/{roundId}/scorecards/{uid}`

One document per golfer per round, keyed by golfer UID. Written as a batch when the round starts.

| Field | Type | Notes |
|---|---|---|
| `golferId` | `string` | UID |
| `golferName` | `string` | Denormalized display name |
| `courseHandicap` | `number` | Calculated at round start |
| `strokeAllocation` | `number[]` | Length 18; index 0 = hole 1; value = strokes on that hole |
| `scores` | `HoleScore[]` | Up to 18 scored holes |
| `totalGross` | `number \| null` | Set when all 18 holes scored |
| `totalNet` | `number \| null` | Set when all 18 holes scored |
| `updatedAt` | `Timestamp` | |

**Why a subcollection?** Each hole score write updates only one golfer's document. Embedding in the round document would require rewriting the full round on every score update and would approach the 1 MiB limit with 4 players.

#### HoleScore Object

| Field | Type | Notes |
|---|---|---|
| `hole` | `number` | Hole number 1–18 |
| `grossScore` | `number` | Raw strokes taken |
| `netScore` | `number` | `grossScore - strokeAllocation[holeIndex]` |

---

## TypeScript Interfaces

All interfaces are in `src/types/`. See the source files for the full definitions.

## Denormalization Decisions

- `courseName` and `teeName` copied into round documents → tee sheet renders without fetching each course
- `golferName` copied into scorecard documents → scorecard grid renders without fetching each user profile
