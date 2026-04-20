# Migration Notes

## Goal

Recreate the legacy TypeScript backend behavior in a Node.js structure without changing the Flutter frontend.

## What is already aligned

- Route names and method coverage match the frontend feature set.
- The user, task, chat, message, and voice draft field names match the Dart models.
- The backend now resolves data from Firestore rather than a local seed dataset.

## What remains intentionally deferred

- No runtime implementation has been written in the new Node.js scaffold yet.
- The `scripts` folder now contains lightweight backend-only utilities.
- The Flutter frontend still uses in-memory mock services, so the backend can continue independently.

## Compatibility rules to keep

- Do not rename contract fields without updating the frontend models later.
- Keep response objects shaped to the current frontend expectations.
- Keep API response shapes stable so the existing preview UI can keep matching the backend contracts.

## Files in scope for later implementation

- `src/routes`
- `src/controllers`
- `src/services`
- `src/repositories`
- `src/triggers`
- `src`
- `docs`
