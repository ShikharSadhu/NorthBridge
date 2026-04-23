# NorthBridge Full-Stack Run Guide

Use these commands to run backend and frontend together with compatible API wiring.

## One-command start

From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-fullstack.ps1
```

Optional target override:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-fullstack.ps1 -FrontendTarget android
```

This starts:

- backend: `backend-nodejs` via `npm run dev`
- frontend: `frontend` via `flutter run` with
	`--dart-define=NB_API_BASE_URL=http://localhost:3000`

## One-command stop

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-fullstack.ps1
```

## VS Code task runner

Run task label:

- `fullstack: run backend + frontend`

Defined in [.vscode/tasks.json](.vscode/tasks.json).

## Windows prerequisite

Flutter plugins on Windows require Developer Mode (symlink support):

```powershell
start ms-settings:developers
```

Enable Developer Mode once, then rerun startup.
