# Architecture

## Overview

TeeSheet is a mobile-first golf app built as a static React SPA served from Google Cloud Run. There is no custom backend server — all data operations go directly from the browser to Firebase services via the Firebase SDK.

```
User Browser (React SPA)
  │  HTTPS
  ▼
Cloud Run  ──  nginx on port 8080
  │            Serves static /dist bundle
  │
  │  Firebase SDK (browser-side, direct WebSocket/HTTPS connections)
  ├── Firebase Auth   → JWT issuance, session management
  └── Firestore       → Real-time document database
                         Security rules enforced server-side
```

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast HMR, tree-shaking, type safety |
| Styling | Tailwind CSS | Utility-first, mobile-first, no CSS bundle bloat |
| Routing | React Router v6 | Standard SPA routing |
| Forms | React Hook Form + Zod | Controlled performance, schema-driven validation |
| Auth | Firebase Authentication | Integrates natively with Firestore, handles email+Google |
| Database | Cloud Firestore | Real-time listeners, offline support, scales to zero |
| Deployment | Google Cloud Run | Containerized, auto-scaling, pay-per-request |
| CI/CD | GitHub Actions | Free tier, native GitHub integration |
| Container | Docker (multi-stage) | Reproducible builds, small nginx image |

## Why No Backend Server?

The React app connects to Firebase directly from the browser. Access control is enforced by Firestore Security Rules, which run server-side inside Google's infrastructure. This eliminates an entire tier of infrastructure, reduces latency, and means Cloud Run only needs to serve static files — a single nginx container is sufficient.

## Data Flow

### Read (live)
```
Component mounts → hook calls onSnapshot() → Firestore opens WebSocket
→ Initial data returned → State set → Component renders
→ Any document change → Firestore pushes update → Component re-renders
```

### Write
```
User action → service function called → Firestore SDK writes doc
→ Firestore evaluates security rules → Write accepted/rejected
→ Optimistic UI updates locally → onSnapshot confirms write
```

## Environment Variables

All `VITE_*` variables are baked into the JS bundle at Docker build time. They are **public** by design (Firebase config is public; security is in Firestore Rules, not config secrecy).

See `.env.example` for the full list.

## Mobile-First Design

The app targets mobile browsers. Key decisions:
- `max-w-lg mx-auto` layout keeps content readable on both phone and desktop
- Fixed bottom navigation bar (native app feel)
- Large tap targets (min 44px touch areas)
- Sticky top nav
- `pb-20` main content padding to avoid bottom nav overlap
