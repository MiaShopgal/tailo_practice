# Firebase mistake-history sync setup

Google sign-in and Firestore sync are optional. Practice and local mistake history continue to work until a Firebase web-app configuration is added.

## Configure Firebase

1. Create a Firebase project on the **Spark** (no-cost) plan and register a web app.
2. In Authentication, enable Google as a sign-in provider. Add the deployed site host (for GitHub Pages, typically `OWNER.github.io`) to the authorized domains.
3. Create a Firestore database. Copy the web app's `apiKey`, `authDomain`, `projectId`, and `appId` into `website/js/firebase-config.js`:

   ```js
   export default {
     apiKey: '...',
     authDomain: '...firebaseapp.com',
     projectId: '...',
     appId: '...',
   };
   ```

   The web configuration is public client configuration, not a secret. Never place a service-account key or Admin SDK credential in the website.
4. Review and publish [`firestore.rules`](../firestore.rules) to the Firebase project. The rules allow each signed-in Google account to read and write only its own `users/{uid}/mistakes` documents. No Firebase project, credentials, or rules have been provisioned by this repository.
5. Deploy the website normally. No build step or Firebase client package installation is required; the Firebase Web SDK is loaded only when the configuration is present.

## Sync behavior

Only learner mistake history is synchronized, including the learner's answer and pitch details. Practice preferences and the sandhi editorial-review tool remain local and are not uploaded.

The first sign-in merges local history with the signed-in account. Each browser profile contributes per-mistake counters; synchronization takes the highest counter for each profile and sums them, so repeat merges do not double-count. The latest activity determines whether a mistake is fixed or reopened. Deletions are retained as tombstones and propagated, including while offline; local changes are retried when the browser reconnects. Signing out leaves both copies intact. If a different Google account is used on a device with existing history, the app asks before merging that history into the new account.

The browser keeps local history as the offline queue. Firestore's browser cache is enabled when available. If browser storage is unavailable or cleared before pending changes synchronize, those changes cannot be recovered. The first release intentionally avoids Cloud Functions and other paid-only services; Firebase Spark quotas still apply, so monitor usage in the Firebase console.

Run the BDD scenarios for history merging with `node --test tests/mistake-sync-core.test.cjs`.
