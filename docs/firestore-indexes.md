# Firestore Indexes

## Required Composite Indexes

### Tee Sheet Query — Public Rounds

Used by: `roundService.onTeeSheetSnapshot()` → `useTeeSheet` hook → `TeeSheetPage`

**Query:**
```typescript
query(
  collection(db, 'rounds'),
  where('isPrivate', '==', false),
  where('status', 'in', ['pending', 'active']),
  orderBy('date', 'asc'),
)
```

**Index:**
```json
{
  "collectionGroup": "rounds",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isPrivate", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

Defined in `firestore.indexes.json` and deployed with:
```bash
firebase deploy --only firestore:indexes
```

---

## Adding New Indexes

If you add a new query with multiple `where()` clauses or a `where()` + `orderBy()` combination, Firestore will reject the query at runtime with an error message that includes a direct link to create the required index in the Firebase console.

To add to the managed indexes file (`firestore.indexes.json`), append the index object to the `"indexes"` array and re-deploy.

---

## Single-Field Indexes

Firestore automatically creates single-field indexes for every field. You only need composite indexes for queries combining multiple fields.
