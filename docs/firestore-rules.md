# Firestore Security Rules

Full rules file: `firestore.rules` in the repository root.

## Permission Matrix

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `users/{uid}` | Own doc or admin | Own doc | Own doc or admin | Admin only |
| `courses/{courseId}` | Any authed user | Any authed user | Creator or admin | Admin only |
| `rounds/{roundId}` | Public: any authed user. Private: golferIds + creator | Any authed user | Creator, admin, or golfers changing only `golferIds` | Creator or admin |
| `rounds/*/scorecards/{uid}` | Golfers in the round | Creator or admin (batch at start) | Own scorecard or creator or admin | Creator or admin |

## Key Rules Explained

### User Profile

Users can only read their own profile (and admins can read all). This prevents one user from browsing another user's handicap or email without admin access.

### Round Join/Leave

The Firestore rule for round updates allows a non-creator, non-admin user to update a round **only if** the only fields being changed are `golferIds` and `updatedAt`. This enables the join/leave functionality without granting broad update access.

```
allow update: if isAuthed()
  && (resource.data.createdBy == request.auth.uid
    || isAdmin()
    || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['golferIds', 'updatedAt']));
```

### Scorecard Read Access

Golfers can read **all** scorecards for a round they're in (needed for the GroupScoreSummary live display). The check is: `request.auth.uid in get(...round).data.golferIds`.

### Admin Function

The `isAdmin()` helper function performs a Firestore document read to check the requesting user's `isAdmin` field. This is evaluated server-side on every request that calls it.

---

## Deploying Rules

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools
firebase login

# Initialize (first time only)
firebase init firestore

# Deploy
firebase deploy --only firestore:rules,firestore:indexes
```

## Testing Rules with the Emulator

```bash
# Start the emulator
firebase emulators:start --only firestore

# Rules are auto-loaded from firestore.rules
# Test via the Emulator UI at http://localhost:4000
```

You can also write rules unit tests using `@firebase/rules-unit-testing` package.
