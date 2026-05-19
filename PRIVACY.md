# Neural GraphMind - Privacy & Data Transparency Policy

This document provides a clear, honest, and legally reasonable overview of exactly how the Neural GraphMind application handles, stores, and transmits information. 

Written in plain English, this policy is strictly based on what the real code actually does—excluding generic boilerplate and irrelevant clauses.

---

### 1. Absolute Zero Automated Profiling
This application does not engage in background tracking, behavioral profiling, automatic analytics telemetry, or browser fingerprinting. Your identity remains entirely anonymous. We collect only what is explicitly entered or initiated by your manual inputs.

### 2. Local Storage Allocation & Presets
We utilize the browser's standard client-side `localStorage` state mechanism to persist client layout customized values. Only the following items are saved:
*   **Aesthetic Theme**: Preferred UI theme (`light` or `dark`).
*   **Appearance Scales**: Chosen node sizing (`small`, `medium`, `large`), connection line thickness, and label typography size.
*   **Physics Simulator Metrics**: Cluster proximity limits and repulsion coefficients to prevent needing to re-configure on refresh.
*   **Local Snapshot Versions**: Created graph versions (`v1`, `v2`, `v3` branching) saved locally when Cloud storage is unused.
This data is stored solely on your physical device and is never uploaded.

### 3. Server-Side & Third-Party API Integrations
When you choose to generate maps or query extractions:
*   **Google Gemini Generative AI Service**: Raw prompt narratives and extraction source text are transmitted to Google's Generative Language API (using `@google/genai` on our proxy server-side). This is necessary to transcribe plain text scripts into NLP-bound node coordinates and links.
*   **Direct Key Overrides**: If you input personal API keys (OpenAI Synapse, Groq Engine, Gemini Overrides) in the "System Core" panel, keys are utilized purely to authenticate your client requests directly and are never logged on our backend dashboard.

### 4. Database Persistence & Collaborative Syncing
When you explicitly sign in via Google Identity Authentication and select cloud actions:
*   **Firebase Authentication**: We securely process sign-in credentials using standard Google Cloud APIs, capturing your user ID, display name, and avatar link strictly to identify your author workspace.
*   **Firebase Firestore Database**: Shared graphs, prompt scriptures, custom nodes, and collaborative revision histories are saved inside standard Firestore collections.
*   **Co-Authoring Invite Link**: Toggling "Public Collab" changes the database document flag `isShared` to `true` and exposes a secure collaboration invite token (`?collab=<id>`). Anyone possessing this token can dynamically fetch, read, and write co-authoring layout iterations in real-time. This stream utilizes the WebSocket-based `onSnapshot` Firebase state listener.

### 5. Revoking and Erasing Data Permissions
At any moment, you retain the complete capability to wipe all records:
*   Use the **"Reset Core"** settings icon to immediately clear all `localStorage` variables and custom presets.
*   Use the **"Trash"** icon on the Neural Archives to immediately remove extractions from Firestore.
*   Log out to revoke the active Google Cloud Identity token entirely.

---
*GraphMind Mapping Protocol Core — Authentically Built for Complete Privacy.*
