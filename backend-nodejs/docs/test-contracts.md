# API Test Contracts

This document defines the expected data shapes (contracts) for all API responses. These contracts serve as the source of truth for frontend and backend communication.

## Table of Contents

1. [User Contract](#user-contract)
2. [Task Contract](#task-contract)
3. [Chat Contract](#chat-contract)
4. [Message Contract](#message-contract)
5. [Voice Draft Contract](#voice-draft-contract)
6. [Error Response Contract](#error-response-contract)
7. [Data Type Standards](#data-type-standards)

---

## User Contract

### Public User Schema (Returned from API)

```javascript
{
  id: string,                    // User identifier
  name: string,                  // User's display name
  rating: number,                // Average rating (0-5)
  location: string,              // City/location string
  // DO NOT INCLUDE: password, email, phone, etc.
}
```

### Endpoints Returning Public User Data

- `GET /v1/users`
- `GET /v1/users/{userId}`
- `GET /v1/tasks/{taskId}` (included in task response as `postedByName`, `postedByUserId`)
- `GET /v1/chats/{chatId}` (included in chat response in `users` array)

### Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | Yes | Unique identifier |
| name | string | Yes | Display name only, no PII |
| rating | number | Yes | Should be 0-5 |
| location | string | Yes | Not full address, city level |

### Security Notes

- **Password** and **email** are NEVER returned in public API responses
- **Phone number** and **address** should not be returned unless specifically requested by authenticated owner
- All sensitive data is stripped before returning user objects

---

## Task Contract

### Task Schema

```javascript
{
  id: string,                    // Task identifier (e.g., "t_123")
  postedByUserId: string,        // User who posted the task
  postedByName: string,          // Display name of task poster
  title: string,                 // Task title
  description: string,           // Task description
  location: string,              // Task location (city/area)
  price: number,                 // Task price in currency
  distanceKm: number,            // Distance from current user
  scheduledAt: string,           // ISO-8601 timestamp
  executionMode: string,         // "online" or "offline"
  acceptedAt?: string,           // ISO-8601 timestamp (optional, only for accepted tasks)
  status?: string,               // Task status (optional)
}
```

### Endpoints Returning Task Data

- `GET /v1/tasks` (list)
- `GET /v1/tasks/{taskId}` (single)

### Field Requirements

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| id | string | Yes | String identifier | e.g., "t_123" |
| postedByUserId | string | Yes | User ID | References user who created task |
| postedByName | string | Yes | String | Display name (no email/phone) |
| title | string | Yes | String (max 100 chars) | Brief task title |
| description | string | Yes | String | Full task description |
| location | string | Yes | String | City/area, not full address |
| price | number | Yes | Positive number | Price in default currency |
| distanceKm | number | Yes | Non-negative number | Distance in kilometers |
| scheduledAt | string | Yes | ISO-8601 | When task should be performed |
| executionMode | string | Yes | Enum: "online", "offline" | How task will be executed |
| acceptedAt | string | No | ISO-8601 | Only present if task accepted |
| status | string | No | String | Optional status field |

### Execution Mode Values

- **"online"**: Task can be completed remotely
- **"offline"**: Task requires in-person execution
- **"hybrid"**: Task can be completed either way (if supported)

---

## Chat Contract

### Chat Schema

```javascript
{
  chatId: string,                // Chat identifier
  taskId: string,                // Associated task ID
  taskTitle: string,             // Title of the task
  taskOwnerUserId: string,       // User ID of task owner
  taskOwnerName: string,         // Display name of task owner
  users: Array<{                 // All users in this chat
    id: string,
    name: string,
    rating: number,
    location: string,
  }>,
  lastMessage: {                 // Most recent message
    id: string,
    text: string,
    timestamp: string,           // ISO-8601
  }
}
```

### Endpoints

- `GET /v1/chats` (list all chats)
- `GET /v1/chats/{chatId}` (single chat)

### Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| chatId | string | Yes | Unique chat identifier |
| taskId | string | Yes | Reference to task |
| taskTitle | string | Yes | Title of associated task |
| taskOwnerUserId | string | Yes | User ID of task creator |
| taskOwnerName | string | Yes | Display name of task owner |
| users | Array<User> | Yes | All participants in chat |
| lastMessage | Object | Yes | Latest message in conversation |
| lastMessage.id | string | Yes | Message ID |
| lastMessage.text | string | Yes | Message content |
| lastMessage.timestamp | string | Yes | ISO-8601 format |

---

## Message Contract

### Message Schema

```javascript
{
  id: string,                    // Message identifier
  chatId: string,                // Chat this message belongs to
  taskId: string,                // Associated task ID
  senderId: string,              // User who sent the message
  text: string,                  // Message content
  timestamp: string,             // ISO-8601 timestamp
}
```

### Endpoints

- `GET /v1/chats/{chatId}/messages`
- `POST /v1/chats/{chatId}/messages`

### Field Requirements

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| id | string | Yes | String | Unique message ID |
| chatId | string | Yes | String | Parent chat ID |
| taskId | string | Yes | String | Reference to task |
| senderId | string | Yes | String | User ID of sender |
| text | string | Yes | String | Message content |
| timestamp | string | Yes | ISO-8601 | When message was sent |

---

## Voice Draft Contract

### Voice Draft Schema

When parsing voice input to create a task draft:

```javascript
{
  title: string,                 // Task title extracted from voice
  description: string,           // Full description
  location: string,              // Location identified
  price: number,                 // Estimated price
  scheduledAt: string,           // ISO-8601 timestamp
  executionMode: string,         // "online" or "offline"
}
```

### Endpoint

- `POST /v1/voice/parse-task`

### Field Requirements

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| title | string | Yes | String | Extracted from transcript |
| description | string | Yes | String | Full task description |
| location | string | Yes | String | Identified location |
| price | number | Yes | Positive number | AI-estimated price |
| scheduledAt | string | Yes | ISO-8601 | Extracted time/date |
| executionMode | string | Yes | "online" or "offline" | Determined from context |

### Example Request and Response

**Request:**
```json
{
  "transcript": "I need help picking up groceries from Whole Foods tomorrow at 2 PM and they should be delivered to my home"
}
```

**Response:**
```json
{
  "draft": {
    "title": "Pick up groceries from Whole Foods",
    "description": "Pick up groceries from Whole Foods and deliver to home",
    "location": "Whole Foods",
    "price": 25,
    "scheduledAt": "2024-01-15T14:00:00Z",
    "executionMode": "offline"
  }
}
```

---

## Error Response Contract

### Error Schema

```javascript
{
  message: string,               // Human-readable error message
  code?: string,                 // Optional error code (e.g., "NOT_FOUND")
  details?: Object,              // Optional error details
}
```

### Error Response Examples

**404 Not Found:**
```json
{
  "message": "Task not found"
}
```

**400 Bad Request:**
```json
{
  "message": "Invalid task data",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "price",
    "issue": "must be a positive number"
  }
}
```

**401 Unauthorized:**
```json
{
  "message": "Authentication required"
}
```

### Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| message | string | Yes | Always present, human-readable |
| code | string | No | Stable error code for programmatic handling |
| details | Object | No | Additional error context |

### Important

- Error responses MUST always have a `message` field
- Do NOT use inconsistent field names like `messageText`, `error`, `msg`
- All errors follow this single contract format

---

## Data Type Standards

### Identifiers

All IDs should be strings with prefixes indicating their type:

- User: `u_123`
- Task: `t_456`
- Chat: `c_789`
- Message: `m_1011`
- Voice Draft: No prefix needed

### Timestamps

All timestamps MUST use ISO-8601 format:

```
YYYY-MM-DDTHH:mm:ssZ  ✓ Correct
2024-01-15T14:30:00Z

2024-01-15 14:30:00   ✗ Wrong format
1705316400            ✗ Unix timestamp
```

### Numbers

- **Price**: Positive number (use 2 decimal places for currency)
- **Distance**: Non-negative number in kilometers
- **Rating**: Number between 0 and 5

### Strings

- **Location**: City/area name, NOT full address
- **Name**: Display name only, NO email or sensitive info
- **Text**: Message content, plain text or formatted string

---

## Validation Best Practices

### Frontend

When receiving data from the API:

```javascript
// Validate required fields
if (!task.id || !task.title || !task.scheduledAt) {
  throw new Error('Invalid task data received');
}

// Validate timestamp format
const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
if (!iso8601Regex.test(task.scheduledAt)) {
  throw new Error('Invalid timestamp format');
}

// Validate executionMode enum
if (!['online', 'offline'].includes(task.executionMode)) {
  throw new Error('Invalid execution mode');
}
```

### Backend

When sending data to the frontend:

```javascript
// Strip sensitive data
const publicUser = {
  id: user.id,
  name: user.name,
  rating: user.rating,
  location: user.location,
  // DO NOT include: password, email, phone, etc.
};

// Always use ISO-8601 timestamps
const timestamp = new Date().toISOString();

// Validate enums
const validModes = ['online', 'offline'];
if (!validModes.includes(executionMode)) {
  throw new Error('Invalid execution mode');
}
```

---

## Versioning

These contracts are versioned with the API itself:

- **Current version**: v1
- **Last updated**: 2024-01-15

When making breaking changes to contracts:

1. Create a new version (e.g., v2)
2. Keep old contracts for backward compatibility
3. Document migration path for frontend
4. Provide deprecation notice in API docs

---

## Testing Contracts

Contract tests are located in `tests/contracts.test.js`. Run tests with:

```bash
npm test -- tests/contracts.test.js
```

These tests verify:

- Required fields are present
- Field types are correct
- Sensitive data is not included
- Timestamps are in ISO-8601 format
- Enums have valid values
- Error responses have consistent format

To add a new contract test:

```javascript
test('MyEntity should have required fields', () => {
  const result = getMyEntity();
  expect(result).toHaveProperty('requiredField');
  expect(typeof result.requiredField).toBe('expectedType');
});
```

---

## Questions or Issues?

If you find a contract mismatch or want to update these definitions:

1. Create an issue describing the discrepancy
2. Update this document
3. Update the contract tests in `tests/contracts.test.js`
4. Update backend code to conform to the contract
5. Merge changes with full test coverage
