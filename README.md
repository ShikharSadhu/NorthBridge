# NorthBridge

NorthBridge is a full-stack marketplace app with a Flutter frontend and a Node.js backend. The backend is designed to transition from mock data to production services backed by Firebase/Firestore, while the frontend already follows a layered architecture that makes the API swap straightforward.

This README explains the repo layout, setup, and day-to-day workflows.

## Repository layout

Key folders at the repo root:

- `backend-nodejs/` Node.js REST API server
- `frontend/` Flutter application
- `functions/` Firebase Functions (TypeScript)
- `firebase/` Firestore rules and indexes
- `dataconnect/` Firebase Data Connect schema and examples
- `scripts/` helper scripts for local workflows
- `docs/` architecture and contract documentation

## Live Deployed

The website is Live on: https://north-bridge.netlify.app/
Check it out!

## Quick start (full stack)

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-fullstack.ps1
```

Optional target override for Flutter:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-fullstack.ps1 -FrontendTarget android
```

This starts:

- Backend: `backend-nodejs` via `npm run dev`
- Frontend: `frontend` via `flutter run` with
  `--dart-define=NB_API_BASE_URL=http://localhost:3000`

Stop everything:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-fullstack.ps1
```

## Prerequisites

General:

- Node.js 18+ and npm
- Flutter SDK (stable channel)
- Firebase CLI (optional, for Firestore rules and functions)

Windows note: Flutter plugins require Developer Mode for symlink support.

```powershell
start ms-settings:developers
```

Enable Developer Mode once, then rerun startup.

## Backend (Node.js)

Location: `backend-nodejs/`

### Install and run

```powershell
cd backend-nodejs
npm install
npm run dev
```

Default local base URL: `http://localhost:3000`

### Key folders

- `src/` app code (controllers, services, repositories, routes)
- `src/config/` environment setup
- `public/` static assets
- `scripts/` backend dev scripts
- `docs/` API contract documents
- `tests/` test suites

### Environment configuration

See the backend docs for expected variables and configuration guidance:

- [backend-nodejs/README.md](backend-nodejs/README.md)
- [backend-nodejs/docs/contract-index.md](backend-nodejs/docs/contract-index.md)

## Frontend (Flutter)

Location: `frontend/`

### Install and run

```powershell
cd frontend
flutter pub get
flutter run --dart-define=NB_API_BASE_URL=http://localhost:3000
```

### Key folders

- `lib/screens/` UI screens
- `lib/widgets/` reusable UI components
- `lib/providers/` state management
- `lib/services/` API, auth, chat, task, voice
- `lib/models/` data models
- `lib/routes/` navigation

For a full frontend architecture guide, see:

- [Frontend_guide.md](Frontend_guide.md)

## Firebase / Firestore

Rules and indexes are stored in:

- [firebase/firestore.rules](firebase/firestore.rules)
- [firebase/firestore.indexes.json](firebase/firestore.indexes.json)

The root `firebase.json` config is used for local tooling and deployments.

## API contracts and migration docs

These docs capture the expected backend contracts and the migration plan from mock data to live APIs:

- [Backend_and_Database_guide.md](Backend_and_Database_guide.md)
- [backend_requirements.md](backend_requirements.md)
- [docs/api-design.md](docs/api-design.md)
- [docs/database-schema.md](docs/database-schema.md)

## Testing

Backend tests live under `backend-nodejs/tests/`.

Run backend tests:

```powershell
cd backend-nodejs
npm test
```

Flutter tests (example):

```powershell
cd frontend
flutter test
```

## Common workflows

### VS Code task

If you use VS Code, run the task:

- `fullstack: run backend + frontend`

### Seed data

There are helper scripts in [scripts/](scripts/) and `backend-nodejs/scripts/` for local seeding and dev tools. Check their README files before use:

- [scripts/run-fullstack.ps1](scripts/run-fullstack.ps1)
- [backend-nodejs/scripts/README.md](backend-nodejs/scripts/README.md)

## Troubleshooting

### Frontend fails to reach backend

- Ensure `NB_API_BASE_URL` points to your backend URL.
- Verify backend is running on port 3000.

### Flutter build issues on Windows

- Enable Developer Mode (symlink support).
- Run `flutter doctor` and fix any reported issues.

## Contributing

- Keep API contracts aligned with the docs in `docs/`.
- Update migration docs if you change backend response shapes.
- Prefer small, focused PRs with tests for new backend endpoints.
