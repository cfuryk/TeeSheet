# Deployment Guide

## Architecture

The app is a static React bundle served by nginx inside a Docker container deployed to Google Cloud Run.

```
GitHub push to main
  → GitHub Actions
    → docker build (Vite bundle baked in)
    → docker push to Artifact Registry
    → gcloud run deploy
      → Cloud Run serves nginx on port 8080
```

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- `docker` installed locally (for manual deploys)
- Firebase project configured (see local-development.md)

---

## First-Time GCP Setup

### 1. Create GCP Project

```bash
gcloud projects create teesheet-app --name="TeeSheet"
gcloud config set project teesheet-app
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable iam.googleapis.com
```

### 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create teesheet \
  --repository-format=docker \
  --location=us-central1 \
  --description="TeeSheet Docker images"
```

### 4. Configure Docker Authentication

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## Manual First Deploy

```bash
# Build image (replace placeholders with real values)
docker build \
  --build-arg VITE_FIREBASE_API_KEY="AIza..." \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com" \
  --build-arg VITE_FIREBASE_PROJECT_ID="your-project" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="123456789" \
  --build-arg VITE_FIREBASE_APP_ID="1:123456789:web:abc123" \
  --build-arg VITE_APP_ENV=production \
  -t us-central1-docker.pkg.dev/teesheet-app/teesheet/teesheet:latest .

# Push image
docker push us-central1-docker.pkg.dev/teesheet-app/teesheet/teesheet:latest

# Deploy to Cloud Run
gcloud run deploy teesheet \
  --image us-central1-docker.pkg.dev/teesheet-app/teesheet/teesheet:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 256Mi \
  --port 8080
```

---

## GitHub Actions CI/CD Setup

### 1. Create Service Account for GitHub Actions

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant required roles
gcloud projects add-iam-policy-binding teesheet-app \
  --member="serviceAccount:github-actions@teesheet-app.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding teesheet-app \
  --member="serviceAccount:github-actions@teesheet-app.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding teesheet-app \
  --member="serviceAccount:github-actions@teesheet-app.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 2. Configure Workload Identity Federation (Keyless)

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Pool"

# Create provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@teesheet-app.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/cfuryk/TeeSheet"
```

### 3. Add GitHub Secrets

In GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | `teesheet-app` |
| `GCP_REGION` | `us-central1` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-actions@teesheet-app.iam.gserviceaccount.com` |
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

---

## Rollback

```bash
# List recent revisions
gcloud run revisions list --service teesheet --region us-central1

# Route all traffic to a previous revision
gcloud run services update-traffic teesheet \
  --to-revisions teesheet-00003-abc=100 \
  --region us-central1
```

---

## Environment Variables and VITE_* Build Args

Firebase config variables are **baked into the JS bundle** at Docker build time. They are NOT runtime environment variables. This is why they must be passed as `--build-arg` in the Docker build command and stored as GitHub Actions secrets.

These variables are intentionally public (the Firebase SDK is designed this way; security comes from Firestore Rules, not config secrecy).

---

## Cloud Run Configuration

| Setting | Value | Reason |
|---|---|---|
| Port | 8080 | Cloud Run requirement |
| Min instances | 0 | Cold start OK for golf app; saves cost |
| Max instances | 3 | Limit runaway scaling |
| Memory | 256Mi | nginx serving static files needs very little RAM |
| Authentication | Unauthenticated | Public web app; Firebase Auth handles user auth |
