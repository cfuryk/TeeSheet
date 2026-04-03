# Round Types

TeeSheet supports four round formats. The format is selected when creating the round and affects scoring display and final leaderboard calculation.

---

## Stroke Play (Gross) — `STROKE_GROSS`

Each golfer plays their own ball and records their raw stroke count (gross score) on every hole.

- **Scoring:** Raw strokes per hole
- **No handicap applied** to hole-by-hole scores
- **Leaderboard:** Sorted by lowest total gross score

---

## Stroke Play (Net) — `STROKE_NET`

Each golfer plays their own ball. Their course handicap is used to calculate a net score on each hole.

- **Scoring:** Gross strokes per hole; net score = gross - stroke allocation
- **Stroke indicator** shown on scorecard for holes where the golfer receives strokes
- **Leaderboard:** Sorted by lowest total net score
- **Course handicap** is calculated at round start from the golfer's Handicap Index + tee slope/rating/par

---

## Best Ball (Gross) — `BEST_BALL_GROSS`

Two teams of two players (2v2). Each player plays their own ball. For each hole, the team's score is the **lower (better) gross score** of the two players on that team.

- **Team assignment:** Set in the Round Lobby before starting
- **Scoring:** Each player records their own gross score; team score per hole = min(player1, player2)
- **Leaderboard:** Team totals; typically scored as holes won vs. the other team (W-L-H format)

---

## Best Ball (Net) — `BEST_BALL_NET`

Same as Best Ball (Gross) but using **net scores** for each player.

- **Course handicap** calculated for each player at round start
- **Team score per hole** = best net score of the two team members on that hole
- **Leaderboard:** Same W-L-H format using net scores

---

## Scorecard Display Differences

| Feature | Gross | Net | Best Ball Gross | Best Ball Net |
|---|---|---|---|---|
| Course handicap shown | No | Yes | No | Yes |
| Stroke indicator on holes | No | Yes | No | Yes |
| Group summary shows net | No | Yes | No | Yes |
| Team score in group summary | No | No | Yes | Yes |

---

## Implementation

- Round type stored in `rounds.roundType` as an enum string
- `src/lib/scoring.ts` contains pure functions for each calculation
- `bestBallHoleScore()` computes the best score among team members for a given hole
- `strokePlayLeaderboard()` sorts scorecards by net or gross total
