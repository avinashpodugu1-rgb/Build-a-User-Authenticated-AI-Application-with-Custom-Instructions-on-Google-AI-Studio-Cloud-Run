# Gemini Reflection Journal

A secure, user-authenticated multi-turn journaling and conversational AI application powered by **Gemini 3.6 Flash** and **Cloud Firestore**, deployed seamlessly on **Google Cloud Run**.

---

## 1. Architectural Overview & Security Model

The application follows a full-stack architecture running on Port 3000:
- **Authentication**: Firebase Authentication via Federated Google Sign-In (no direct password storage).
- **Backend Database**: Cloud Firestore with strict owner-isolated security rules (`/users/{userId}/interactions/{interactionId}`).
- **AI Processing Engine**: Express backend proxy (`/api/gemini/reflect`) invoking the official `@google/genai` TypeScript SDK with an automated model fallback ladder:
  - Primary: `gemini-3.6-flash`
  - High-Availability Fallback: `gemini-3.1-flash-lite`
  - Dynamic Alias: `gemini-flash-latest`
  - Deep Reasoning Fallback: `gemini-3.7-flash`
- **Secret Hygiene**: `GEMINI_API_KEY` is strictly managed server-side via Google Cloud Secret Manager and container environment variables. Never exposed to client bundles.
- **Payload Sanitization**: Automatic undefined-stripping (`sanitizePayload`) before database writes, preventing driver crashes.

---

## 2. Cloud Firestore Security Rules

To enforce zero-trust user data isolation, the deployed `firestore.rules` file enforces:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global default-deny safety net
    match /{document=**} {
      allow read, write: if false;
    }

    // Health check endpoint for testing database connectivity
    match /test/connection {
      allow read: if true;
    }

    // User profile document strictly isolated to the authenticated owner
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Interactions and reflection entries strictly isolated to the authenticated owner
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 3. Google Cloud Prerequisites & Secret Setup

### Step 1: Enable Google Cloud APIs
Ensure the gcloud CLI is authenticated and configure your default project:
```bash
gcloud config set project <PROJECT_ID>

# Enable necessary Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### Step 2: Configure Secret Manager for Gemini API Key
Store your Gemini API key in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Compute / Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container directly to Google Cloud Run:

```bash
# Deploy container to Cloud Run mounting the Secret Manager secret
gcloud run deploy gemini-journal \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 5. Required Campaign Verification Binding

Apply the mandatory challenge verification label to register your Cloud Run service:

```bash
gcloud run services update gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 6. Functional Walkthrough & Test Guide

Every interaction can be verified systematically:
1. **Google Sign-In Test**: Navigate to the landing page and click **Sign In with Google Account**. Verify successful authentication and redirection to the private dashboard.
2. **Reflection Generation Test**: Choose a mode (e.g. *Deep Reflection*), enter journal thoughts, and submit. Verify Gemini 3.6 Flash returns a response and an executive summary.
3. **Multi-Turn Chat Test**: Submit a follow-up inquiry. Verify the conversation history expands and updates the turn count.
4. **Data Isolation Test**: Inspect the Firestore console under `/users/{YOUR_UID}/interactions/`. Verify documents are present under your UID only.
5. **History & Search Test**: Switch to the **History** tab. Search for keywords and verify instantaneous filtering. Click an entry to reopen and continue conversing.
6. **Security Panel Test**: Open the **Security & Path** tab. Verify the database ping returns "Connected to Firestore" and active path isolation matches your UID.
