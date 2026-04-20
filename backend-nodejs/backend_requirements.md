# NorthBridge Backend Requirements

## 1. Purpose

This document is the build contract for moving NorthBridge from frontend mock data to a production backend.

It is based on a full read-only audit of:
- frontend/lib
- backend-nodejs/src
- backend-nodejs/docs

## 2. Audit Summary

### 2.1 Frontend integration status

- Frontend service layer is still mock/in-memory.
- frontend/lib/services/api_service.dart is empty.
- frontend/lib/services/location_service.dart is empty.
- Auth, task, and chat services currently use local test data stores.

### 2.2 Backend status

- Backend route/controller/service/repository structure exists and runs.
- Async request flow is wired end-to-end.
- Firestore path exists through a REST-based client.
- Current auth verifies Firebase ID tokens and resolves the current user from token claims.

### 2.3 Important contract gaps

- User profile fields used by frontend are only partially supported by backend.
- Chat message model in frontend includes optional imageDataUrl and isPaymentRequest.
- Voice draft frontend model requires executionMode, but backend draft model does not include it.

## 3. System Status Matrix (Skeleton vs Improvement)

Status legend:
- Implemented baseline: works for basic flow.
- Skeleton needs improvement: structure exists but not production ready.
- Missing: no real implementation for frontend app flow.

| System | Current backend state | Status | Required work |
| --- | --- | --- | --- |
| 1. Authentication and session | login/signup/me/logout exist with Firebase token verification | Implemented baseline | Complete Firebase-native signup/login profile bootstrap, improve auth diagnostics |
| 2. User profile and identity | Public user fetch exists; profile patch only name/location/email | Skeleton needs improvement | Support bio, phoneNumber, skills, profileImageUrl, privatePaymentQrDataUrl, tasksDone mapping |
| 3. Task posting and listing | list/get/create/accept implemented | Implemented baseline | Add query filtering, server sorting, pagination, stronger validation, ownership checks |
| 4. Task lifecycle and history | accept is implemented; history computed on frontend only | Skeleton needs improvement | Add backend task history endpoint, completion/cancel states, payout-ready lifecycle |
| 5. Chat threads and messages | list chats, list messages, send message implemented | Implemented baseline | Add chat creation endpoint, permission checks, pagination/order guarantees |
| 6. Media attachments in chat | backend message model lacks imageDataUrl | Missing | Persist imageDataUrl or media URL, validate size/type, include in API responses |
| 7. Payment request workflow | no payment domain endpoints, only text/image message path | Missing | Add payment-request flag persistence, optional payment request resource, status tracking |
| 8. Voice to task draft | parse endpoint exists | Skeleton needs improvement | Return executionMode and improve extraction quality; connect voice draft to task creation flow |
| 9. Location and matching | geo utility exists, matching service exists, not integrated into task APIs | Skeleton needs improvement | Compute distanceKm from coordinates or geocoding; expose nearby/filter endpoints |
| 10. Realtime updates | no websocket/stream channel | Missing | Add realtime strategy for chat messages, task changes, and basic presence |
| 11. Trust and safety reporting | no backend report/moderation endpoint | Missing | Add report-user/report-message endpoints with reason, reporter, target, and review state |

## 4. Required Data Contracts

All timestamps must be ISO-8601 strings.

### 4.1 User contract

Public user response:

- id: string
- name: string
- bio: string
- rating: number
- tasksDone: number
- location: string
- skills: string[]
- profileImageUrl: string

Private/self response (authenticated user only):

- all public fields
- phoneNumber: string
- email: string
- privatePaymentQrDataUrl: string

Notes:
- Never return password or password hash.
- If backend stores completedTasks, map it to tasksDone in API responses.

### 4.2 Task contract

- id: string
- postedByUserId: string
- postedByName: string
- title: string
- description: string
- location: string
- price: number
- distanceKm: number
- scheduledAt: string
- executionMode: online | offline
- status: open | accepted | completed | cancelled
- acceptedByUserId?: string
- acceptedAt?: string
- completedAt?: string
- cancelledAt?: string

### 4.3 Chat contract

- chatId: string
- taskId: string
- taskTitle: string
- taskOwnerUserId: string
- taskOwnerName: string
- users: string[]
- lastMessage: Message
- updatedAt?: string

### 4.4 Message contract

- id: string
- chatId: string
- taskId: string
- senderId: string
- text: string
- timestamp: string
- imageDataUrl?: string
- isPaymentRequest?: boolean

### 4.5 Voice draft contract

- title: string
- description: string
- location: string
- price: number
- scheduledAt: string
- executionMode: online | offline

### 4.6 Error contract

- message: string
- code?: string
- details?: object

## 5. Required API Endpoints

All endpoints remain under /v1.

### 5.1 Auth and users

Existing baseline:
- GET /auth/me
- POST /auth/login
- POST /auth/signup
- POST /auth/logout
- PATCH /auth/me/profile
- GET /users
- GET /users/:userId

Required improvements:
- PATCH /auth/me/profile must support full editable profile fields from frontend.
- GET /auth/me should return self/private-safe shape (including privatePaymentQrDataUrl).
- GET /users/:userId should return public-safe shape.

### 5.2 Tasks

Existing baseline:
- GET /tasks
- GET /tasks/:taskId
- POST /tasks
- POST /tasks/:taskId/accept

Required new or improved:
- GET /tasks with query params: sortBy, executionMode, minPrice, maxPrice, status, page, pageSize.
- GET /tasks/history/me (or /users/:userId/tasks/history with auth checks).
- POST /tasks/:taskId/complete.
- POST /tasks/:taskId/cancel.

### 5.3 Chats and messages

Existing baseline:
- GET /chats
- GET /chats/:chatId/messages
- POST /chats/:chatId/messages

Required new or improved:
- POST /chats (open or create by taskId + participantUserId).
- GET /chats with filtering to current user only.
- GET /chats/:chatId/messages supports pagination and chronological ordering.
- POST /chats/:chatId/messages supports imageDataUrl and isPaymentRequest.

### 5.4 Voice

Existing baseline:
- POST /voice/parse-task

Required improvements:
- Must include executionMode in draft output.
- Should return structured confidence metadata (optional but recommended).

### 5.5 Trust and safety

Required new:
- POST /reports/users/:userId
- POST /reports/messages/:messageId

Minimal payload:
- reason: string
- details?: string

### 5.6 Health and diagnostics

Existing:
- GET /health

Required improvements:
- Report auth mode, firestore connectivity, and build version.

## 6. Firestore Data Model Requirements

### 6.1 Collections

users:
- id
- name
- bio
- rating
- tasksDone
- location
- phoneNumber
- email
- skills
- profileImageUrl
- privatePaymentQrDataUrl
- passwordHash (if local auth is ever retained; do not expose)

tasks:
- id
- postedByUserId
- postedByName
- title
- description
- location
- locationGeo: { lat, lng } optional
- price
- distanceKm (computed response field, not required to persist)
- scheduledAt
- executionMode
- status
- acceptedByUserId
- acceptedAt
- completedAt
- cancelledAt
- createdAt
- updatedAt

chats:
- chatId
- taskId
- taskTitle
- taskOwnerUserId
- taskOwnerName
- users
- lastMessage
- createdAt
- updatedAt

messages:
- id
- chatId
- taskId
- senderId
- text
- timestamp
- imageDataUrl
- isPaymentRequest

reports:
- id
- targetType: user | message
- targetId
- reporterUserId
- reason
- details
- status: open | reviewing | resolved
- createdAt
- updatedAt

### 6.2 Indexes

Minimum indexes recommended:
- tasks: status + scheduledAt desc
- tasks: executionMode + scheduledAt desc
- tasks: postedByUserId + createdAt desc
- tasks: acceptedByUserId + scheduledAt desc
- chats: users array-contains + updatedAt desc
- messages: chatId + timestamp asc
- reports: targetType + createdAt desc

## 7. Security and Authorization Requirements

- Replace mock bearer parsing with Firebase ID token verification.
- Resolve current user from verified token claims.
- Enforce resource authorization:
  - only owner can edit own profile
  - only eligible user can accept task
  - only chat participant can read/send messages
- Validate all input fields and reject unknown dangerous payload shapes.
- Add basic rate limiting for auth and message endpoints.
- Sanitize and size-limit imageDataUrl payloads.

## 8. Realtime Requirements

Target realtime capabilities:
- New message events per chat.
- Task status changes (open, accepted, completed, cancelled).
- Optional presence state for chat list freshness.

Recommended approach:
- Add websocket channel with auth handshake.
- Keep REST as source of truth and websocket as event fan-out.

## 9. Migration Requirements (Mocks to Live APIs)

### Backend work

- Stabilize final contracts in backend responses.
- Ensure Firestore mode is production-ready.
- Do not restore seed fallback runtime paths.

### Frontend work

- Implement api_service.dart for HTTP transport.
- Implement location_service.dart for user location capture/geocoding.
- Replace test_data service logic with backend calls while keeping models unchanged.

## 10. Testing Requirements

Must pass before production usage:

- Contract tests for every entity and endpoint.
- Integration tests for critical flows:
  - signup/login -> create task -> accept task -> open/create chat -> send message
  - profile edit including QR and skills
  - voice parse -> preview -> create task
- Authorization tests for forbidden access patterns.
- Error-shape consistency tests.

## 11. Priority Plan

### Phase 1 (P0)

- Full profile field support.
- Voice draft executionMode support.
- Token verification and auth hardening.

### Phase 2 (P1)

- Chat create endpoint.
- Message imageDataUrl and isPaymentRequest persistence.
- Task history endpoint.

### Phase 3 (P2)

- Location-based distance calculation and filters.
- Task lifecycle completion/cancel transitions.
- Reporting endpoints.

### Phase 4 (P3)

- Realtime delivery.
- Additional moderation/analytics tooling.

## 12. Definition of Done

Backend is ready for frontend live integration when all items are true:

- Frontend no longer depends on test_data stores for auth/tasks/chats/voice parsing.
- All required contracts in Section 4 are served by backend endpoints.
- All systems marked Missing or Skeleton in Section 3 are upgraded to production-ready behavior for current frontend features.
- Firestore-backed flow passes integration tests and health diagnostics.
