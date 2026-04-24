# Backend and Database Guide

## Scope
This guide covers the production backend/database integration for the current Flutter frontend in the `frontend` folder.

It includes:
- The data contract expected by the app (Auth, Tasks, Chats, Messages, Voice draft).
- Which frontend files consume/produce each contract.
- How to replace temporary test-data stores with real API + realtime updates.
- A full source inventory for the built frontend under `frontend/lib`.

---

## 1) Current architecture and integration points

### App boot and dependency wiring
- Entry point: `frontend/lib/main.dart`
- Providers initialized at startup:
  - `TaskProvider.loadTasks()`
  - `AuthProvider.loadCurrentUser()`
  - `ChatProvider.loadChats()`

### Layering used in app
- **UI**: `screens/*`, `voice/*`, `widgets/*`
- **State**: `providers/*`
- **Domain models**: `models/*`
- **Data/services**: `services/*`
- **Mock seeds**: `services/test_data/*`

### Where backend API client should live
- `frontend/lib/services/api_service.dart` (currently empty)

Recommended usage:
- Add HTTP methods (`get`, `post`, `patch`, etc.) + auth token injection in `api_service.dart`.
- Call `ApiService` from `auth_service.dart`, `task_service.dart`, `chat_service.dart`.
- Keep providers unchanged as orchestration layer.

---

## 2) Data contracts (what backend must accept/return)

## 2.1 User contract
Used by:
- `frontend/lib/models/user_model.dart`
- `frontend/lib/services/auth_service.dart`
- `frontend/lib/providers/auth_provider.dart`

Required JSON shape:

```json
{
  "id": "string",
  "name": "string",
  "bio": "string",
  "rating": 4.8,
  "tasksDone": 18,
  "location": "string",
  "phoneNumber": "string",
  "email": "string",
  "skills": ["string"],
  "profileImageUrl": "string (URL or data URL)",
  "privatePaymentQrDataUrl": "string (private, owner only)"
}
```

Notes:
- `privatePaymentQrDataUrl` must never be exposed on public-profile endpoints.
- Public profile endpoint should exclude private payment QR.

---

## 2.2 Task contract
Used by:
- `frontend/lib/models/task_model.dart`
- `frontend/lib/models/task_mode.dart`
- `frontend/lib/services/task_service.dart`
- `frontend/lib/providers/task_provider.dart`

Required JSON shape:

```json
{
  "id": "string",
  "postedByUserId": "string",
  "postedByName": "string",
  "title": "string",
  "description": "string",
  "location": "string",
  "price": 250.0,
  "distanceKm": 1.3,
  "scheduledAt": "ISO-8601 datetime",
  "executionMode": "online|offline",
  "acceptedByUserId": "string|null",
  "acceptedAt": "ISO-8601 datetime|null",
  "isActive": true,
  "completionRequestedByUserId": "string|null",
  "completionRequestedAt": "ISO-8601 datetime|null",
  "completedByUserId": "string|null",
  "completedAt": "ISO-8601 datetime|null",
  "isRatingPending": false,
  "completionRating": 4.5,
  "ratedAt": "ISO-8601 datetime|null"
}
```

Lifecycle notes:
- `isActive=true` means task should appear in ongoing sections; `isActive=false` means past/completed.
- Accepted task must remain active until owner confirms completion.
- After completion confirmation, set `isRatingPending=true` so owner can rate helper.

Sorting options expected by UI:

```json
[
  { "type": "default", "label": "Default" },
  { "type": "distance", "label": "Distance" },
  { "type": "closestDate", "label": "Closest Date" },
  { "type": "latestDate", "label": "Latest Date" },
  { "type": "online", "label": "Online" },
  { "type": "offline", "label": "Offline" }
]
```

---

## 2.3 Chat + Message contracts
Used by:
- `frontend/lib/models/chat_model.dart`
- `frontend/lib/models/message_model.dart`
- `frontend/lib/services/chat_service.dart`
- `frontend/lib/providers/chat_provider.dart`
- `frontend/lib/screens/chat/*`

Chat shape:

```json
{
  "chatId": "string",
  "taskId": "string",
  "taskTitle": "string",
  "taskOwnerUserId": "string",
  "taskOwnerName": "string",
  "users": ["string", "string"],
  "lastMessage": { "...Message" }
}
```

Message shape:

```json
{
  "id": "string",
  "chatId": "string",
  "taskId": "string",
  "senderId": "string",
  "text": "string",
  "timestamp": "ISO-8601 datetime",
  "imageDataUrl": "string|null",
  "isPaymentRequest": true
}
```

Notes:
- `imageDataUrl` currently supports base64 data URLs (device-picked image).
- For production, prefer media upload endpoint returning CDN URL, and change model field to `imageUrl`.

---

## 2.4 Voice draft contract
Used by:
- `frontend/lib/models/voice_task_draft_model.dart`
- `frontend/lib/providers/voice_provider.dart`
- `frontend/lib/services/task_service.dart` (`processVoiceInput`)

Expected structured draft payload:

```json
{
  "title": "string",
  "description": "string",
  "location": "string",
  "price": 100.0,
  "scheduledAt": "ISO-8601 datetime",
  "executionMode": "online|offline"
}
```

---

## 3) Endpoint mapping (replace mock logic)

## 3.1 Auth endpoints
Replace in `frontend/lib/services/auth_service.dart`:
- `getCurrentUser()` -> `GET /me`
- `getUserById(userId)` -> `GET /users/:id` (public-safe payload)
- `signInWithCredentials(email,password)` -> `POST /auth/login`
- `signUpWithCredentials(...)` -> `POST /auth/signup`
- `signOutMock()` -> `POST /auth/logout` (or local token clear)
- `updateCurrentUserProfile(...)` -> `PATCH /me/profile`

## 3.2 Task endpoints
Replace in `frontend/lib/services/task_service.dart`:
- `fetchSortOptions()` -> `GET /tasks/sort-options` (or keep static in backend config)
- `fetchTasks(sortBy)` -> `GET /tasks?sort=...`
- `createTask(...)` -> `POST /tasks`
- `acceptTask(taskId,userId)` -> `POST /tasks/:id/accept`
- `requestTaskCompletion(taskId,helperUserId)` -> `POST /tasks/:id/completion/request`
- `confirmTaskCompletion(taskId,ownerUserId)` -> `POST /tasks/:id/completion/confirm`
- `declineTaskCompletion(taskId,ownerUserId)` -> `POST /tasks/:id/completion/decline`
- `submitTaskRating(taskId,ownerUserId,rating)` -> `POST /tasks/:id/rating`
- `processVoiceInput(text)` -> `POST /voice/tasks/parse` (optional server parser)

## 3.4 Profile rating update endpoint
Replace in `frontend/lib/services/auth_service.dart`:
- `submitRatingForUser(targetUserId,rating)` -> `POST /users/:id/rating`

Expected backend behavior:
- Recompute and persist user aggregate rating.
- Increment `tasksDone` after successful completion rating.
- Return updated public-safe user profile.

## 3.3 Chat endpoints
Replace in `frontend/lib/services/chat_service.dart`:
- `fetchChats()` -> `GET /chats`
- `fetchMessages(chatId)` -> `GET /chats/:id/messages`
- `sendMessage(...)` -> `POST /chats/:id/messages`
- `getOrCreateTaskChat(task,helperUserId)` -> `POST /tasks/:id/chats/open`

---

## 4) Realtime integration guide

### Recommended backend capabilities
- Realtime chat messages (WebSocket/Firebase listener/SSE)
- Task acceptance updates
- Profile updates (optional)

### Frontend integration points
- `frontend/lib/providers/chat_provider.dart`
  - Add subscription method (e.g., `subscribeToChat(chatId)`) and update `_messagesState` on incoming events.
- `frontend/lib/providers/task_provider.dart`
  - Add task stream subscription and refresh `_state` when tasks mutate server-side.

### Event payloads
- `chat.message.created`
- `chat.updated`
- `task.updated`

Use same model JSON contracts as above so existing `fromJson` parsers continue to work.

---

## 5) How to remove temporary test data

Temporary data files currently used:
- `frontend/lib/services/test_data/chat_test_data.dart`
- `frontend/lib/services/test_data/message_test_data.dart`
- `frontend/lib/services/test_data/task_test_data.dart`
- `frontend/lib/services/test_data/task_sort_options_test_data.dart`
- `frontend/lib/services/test_data/user_test_data.dart`
- `frontend/lib/services/test_data/voice_input_instructions_test_data.dart`

## Step-by-step migration
1. Implement API client in `frontend/lib/services/api_service.dart`.
2. In each service (`auth_service.dart`, `task_service.dart`, `chat_service.dart`), replace in-memory stores and mock delays with HTTP calls.
3. Keep model parsing (`fromJson`) unchanged where possible.
4. Keep provider APIs unchanged so UI doesn’t need major refactor.
5. Remove `services/test_data/*` imports after endpoints are wired.
6. Keep `voice_input_instructions_test_data.dart` only if you want static policy copy; otherwise fetch from backend moderation/config endpoint.

---

## 6) UI hardcoded-data verification summary

Audit result:
- Domain entities (tasks/chats/messages/users) are **not** hardcoded in UI screens.
- Runtime entity data is read via providers/services/models.
- Temporary domain data currently enters app through service-layer test-data files listed above.

Nuance:
- `frontend/lib/voice/voice_input_screen.dart` reads instruction text from `services/test_data/voice_input_instructions_test_data.dart`.
  - This is still test-data sourced (not inline hardcoded in widget body).

What remains hardcoded in UI by design:
- Static labels/messages (button text, warnings, empty-state copy).

---

## 7) Security and privacy requirements for backend team

- Never expose `privatePaymentQrDataUrl` in public user responses.
- Store media securely (preferred: object storage + signed URLs).
- Validate all message uploads and run moderation checks for image content.
- Keep report-user endpoint auditable:
  - Suggested endpoint: `POST /reports/users`
  - Payload: `{ reporterUserId, targetUserId, reason, chatId, timestamp }`

---

## 8) File-by-file inventory (frontend/lib)

## 8.1 App bootstrap
- `frontend/lib/main.dart`

## 8.2 Core
- `frontend/lib/core/constants/app_spacing.dart`
- `frontend/lib/core/state/view_state.dart`
- `frontend/lib/core/theme/app_theme.dart`
- `frontend/lib/core/utils/date_time_utils.dart`
- `frontend/lib/core/utils/device_image_picker.dart`

## 8.3 Models
- `frontend/lib/models/chat_model.dart`
- `frontend/lib/models/message_model.dart`
- `frontend/lib/models/task_mode.dart`
- `frontend/lib/models/task_model.dart`
- `frontend/lib/models/task_sort_option_model.dart`
- `frontend/lib/models/user_model.dart`
- `frontend/lib/models/voice_capture_result_model.dart`
- `frontend/lib/models/voice_instruction_item_model.dart`
- `frontend/lib/models/voice_task_draft_model.dart`

## 8.4 Providers
- `frontend/lib/providers/auth_provider.dart`
- `frontend/lib/providers/chat_provider.dart`
- `frontend/lib/providers/task_provider.dart`
- `frontend/lib/providers/voice_provider.dart`

## 8.5 Routes
- `frontend/lib/routes/app_routes.dart`

## 8.6 Services
- `frontend/lib/services/api_service.dart` (empty placeholder)
- `frontend/lib/services/auth_service.dart`
- `frontend/lib/services/chat_service.dart`
- `frontend/lib/services/location_service.dart` (empty placeholder)
- `frontend/lib/services/task_service.dart`
- `frontend/lib/services/voice_service.dart`

## 8.7 Service test-data
- `frontend/lib/services/test_data/chat_test_data.dart`
- `frontend/lib/services/test_data/message_test_data.dart`
- `frontend/lib/services/test_data/task_sort_options_test_data.dart`
- `frontend/lib/services/test_data/task_test_data.dart`
- `frontend/lib/services/test_data/user_test_data.dart`
- `frontend/lib/services/test_data/voice_input_instructions_test_data.dart`

## 8.8 Screens
- `frontend/lib/screens/auth/auth_screen.dart`
- `frontend/lib/screens/chat/chat_list_screen.dart`
- `frontend/lib/screens/chat/chat_thread_screen.dart`
- `frontend/lib/screens/home/home_screen.dart`
- `frontend/lib/screens/profile/profile_screen.dart`
- `frontend/lib/screens/profile/public_profile_screen.dart`
- `frontend/lib/screens/task/task_details_screen.dart`
- `frontend/lib/screens/task/task_history_screen.dart`
- `frontend/lib/screens/task/task_post_screen.dart`
- `frontend/lib/screens/task/task_root_screen.dart`
- `frontend/lib/screens/voice/voice_input_screen.dart` (exists but empty)

## 8.9 Voice screens (active)
- `frontend/lib/voice/voice_input_screen.dart`
- `frontend/lib/voice/voice_preview_screen.dart`

## 8.10 Widgets
- `frontend/lib/widgets/app_button.dart`
- `frontend/lib/widgets/app_card.dart`
- `frontend/lib/widgets/app_text_field.dart`
- `frontend/lib/widgets/listening_animation.dart`
- `frontend/lib/widgets/mic_button.dart`
- `frontend/lib/widgets/rating_widget.dart`
- `frontend/lib/widgets/skeleton_box.dart`
- `frontend/lib/widgets/task_card.dart`
- `frontend/lib/widgets/task_card_skeleton.dart`
- `frontend/lib/widgets/user_avatar.dart`
- `frontend/lib/widgets/user_name_with_avatar.dart`

## 8.11 Generated dataconnect files (currently not integrated in app flow)
- `frontend/lib/dataconnect_generated/add_review.dart`
- `frontend/lib/dataconnect_generated/create_movie.dart`
- `frontend/lib/dataconnect_generated/delete_review.dart`
- `frontend/lib/dataconnect_generated/generated.dart`
- `frontend/lib/dataconnect_generated/get_movie_by_id.dart`
- `frontend/lib/dataconnect_generated/list_movies.dart`
- `frontend/lib/dataconnect_generated/list_user_reviews.dart`
- `frontend/lib/dataconnect_generated/list_users.dart`
- `frontend/lib/dataconnect_generated/search_movie.dart`
- `frontend/lib/dataconnect_generated/upsert_user.dart`

---

## 9) Handoff checklist for backend team

- [ ] Implement auth, tasks, chats, messages endpoints with JSON contracts above.
- [ ] Add realtime subscriptions for chat/task updates.
- [ ] Return `executionMode` and all required fields in task responses.
- [ ] Ensure private payment QR is owner-only.
- [ ] Implement user-report endpoint and moderation workflow.
- [ ] Replace test-data imports in services with API calls.
- [ ] Keep provider and model APIs stable to avoid UI regressions.
- [ ] Implement completion request/confirm/decline task endpoints.
- [ ] Persist `isActive` and completion metadata transitions correctly.
- [ ] Implement post-completion rating endpoints and user aggregate update.

---

## 10) Required lifecycle flows (storage + display)

This section defines exactly how profile data, chat history, and task acceptance changes should be stored and reflected in UI.

## 10.1 Profile storage and display flow

### Store (write path)
- Screen: `frontend/lib/screens/profile/profile_screen.dart`
- Provider: `frontend/lib/providers/auth_provider.dart` (`updateProfile`)
- Service: `frontend/lib/services/auth_service.dart` (`updateCurrentUserProfile`)
- Endpoint target: `PATCH /me/profile`

Payload backend should accept:

```json
{
  "name": "string",
  "bio": "string",
  "location": "string",
  "phoneNumber": "string",
  "email": "string",
  "skills": ["string"],
  "profileImageUrl": "string",
  "privatePaymentQrDataUrl": "string"
}
```

### Read (display path)
- Current user profile: `GET /me` used by `loadCurrentUser()`.
- Public profile view: `GET /users/:id` used by `loadUserById(userId)`.

### Privacy rules
- `privatePaymentQrDataUrl` must be returned only for `GET /me` and never for `GET /users/:id`.
- Public profile still returns `rating`, `tasksDone`, `skills`, `profileImageUrl`, `bio`, etc.

## 10.2 Chat history storage and retrieval flow

### Store (write path)
- Screen: `frontend/lib/screens/chat/chat_thread_screen.dart`
- Provider: `frontend/lib/providers/chat_provider.dart` (`sendMessage`)
- Service: `frontend/lib/services/chat_service.dart` (`sendMessage`)
- Endpoint target: `POST /chats/:id/messages`

Message payload expected by backend:

```json
{
  "chatId": "string",
  "taskId": "string",
  "senderId": "string",
  "text": "string",
  "imageDataUrl": "string|null",
  "isPaymentRequest": false
}
```

### Read (display path)
- Chat list/history: `GET /chats`
- Chat thread history: `GET /chats/:id/messages`

### Persisted behavior required
- Every new message must update `lastMessage` for its parent chat.
- Message ordering must be chronological by `timestamp`.
- Chat list should show latest activity ordering.

## 10.3 Task acceptance recording flow (critical)

### Acceptance write
- Screen action: `frontend/lib/screens/task/task_details_screen.dart` (`Accept task`)
- Provider: `frontend/lib/providers/task_provider.dart` (`acceptTask`)
- Service: `frontend/lib/services/task_service.dart` (`acceptTask`)
- Endpoint target: `POST /tasks/:id/accept`

Backend must perform atomically:
1. Validate task exists.
2. Reject if accepter is task owner.
3. Reject if already accepted by another user.
4. Set:
   - `acceptedByUserId = <accepterId>`
   - `acceptedAt = <server timestamp>`

Suggested success response:

```json
{
  "result": "accepted",
  "task": {
    "id": "string",
    "acceptedByUserId": "string",
    "acceptedAt": "ISO-8601 datetime"
  }
}
```

### Acceptance read impacts (must reflect in UI)
- Task list/details: accepted state badge/button behavior.
- Task history: accepted user’s ongoing/past sections.
- Chat availability: accepted task should allow helper-owner conversation.

### Optional but recommended side effects
- Auto-open/create chat between owner and accepter.
- Emit realtime `task.updated` event so all clients refresh immediately.

## 10.4 Task completion confirmation + rating flow (new)

### Completion request (helper action)
- Screen action: `frontend/lib/screens/chat/chat_thread_screen.dart` (`Mark task as done`)
- Provider: `frontend/lib/providers/task_provider.dart` (`requestTaskCompletion`)
- Service: `frontend/lib/services/task_service.dart` (`requestTaskCompletion`)
- Endpoint target: `POST /tasks/:id/completion/request`

Backend must enforce:
1. Task exists.
2. Requester is the accepted helper (`acceptedByUserId`).
3. Task is still active (`isActive=true`).
4. Set:
  - `completionRequestedByUserId = <helperId>`
  - `completionRequestedAt = <server timestamp>`

### Completion confirm/decline (owner action)
- Confirm endpoint: `POST /tasks/:id/completion/confirm`
- Decline endpoint: `POST /tasks/:id/completion/decline`

On confirm backend must set:
- `isActive = false`
- `completedByUserId = <helperId>`
- `completedAt = <server timestamp>`
- `isRatingPending = true`
- Keep or clear request metadata per backend convention (frontend supports either).

On decline backend must set:
- `completionRequestedByUserId = null`
- `completionRequestedAt = null`
- Keep `isActive = true`

### Rating after completion (owner action)
- Screen action: `frontend/lib/screens/chat/chat_thread_screen.dart` (`Rate the helper`)
- Provider/service path:
  - Task: `TaskProvider.submitTaskRating` -> `TaskService.submitTaskRating`
  - Profile: `AuthProvider.submitRatingForUser` -> `AuthService.submitRatingForUser`

Backend must atomically ensure:
1. Task is completed and still rating-pending.
2. Rating author is task owner.
3. Rating target is completed helper.
4. Set task fields:
  - `completionRating = <1..5>`
  - `ratedAt = <server timestamp>`
  - `isRatingPending = false`
5. Update helper profile aggregates (`rating`, `tasksDone`).

### Display rules expected by frontend
- Ongoing vs past sections are driven by `isActive`, not `scheduledAt`.
- Owner sees confirm/decline only when completion request is pending.
- Owner sees rating prompt only when task is completed and `isRatingPending=true`.

