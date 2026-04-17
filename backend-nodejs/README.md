# NorthBridge Backend

This backend can run against the local seed data or against Firestore when the Firebase environment is configured.

## Firestore setup

Set one of the following before starting the server:

- `FIREBASE_CREDENTIALS_JSON`: full service account JSON as a single string
- `GOOGLE_APPLICATION_CREDENTIALS`: path to a service account JSON file
- `FIREBASE_PROJECT_ID`: your Firebase project ID
- `FIRESTORE_EMULATOR_HOST`: host and port for the Firestore emulator, for example `127.0.0.1:8080`

Optional values:

- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_APP_ID`
- `FIREBASE_EMULATOR=true`

## Health check

Request `GET /v1/health` to confirm the backend is up. The response now includes a `firestore` block that shows whether Firestore is configured and reachable.

## Notes

- When Firestore is not configured, the backend falls back to the seeded local data in `backend-nodejs/mock-data/seed-data.js`.
- The API route layer is async now so Firestore reads and writes can complete before the response is returned.
