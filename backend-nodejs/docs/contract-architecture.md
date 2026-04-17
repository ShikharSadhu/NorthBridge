# API Contract Architecture Diagram

## Contract Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NORTHBRIDGE API v1                              │
└─────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │  ERROR RESPONSE  │
                            │  - message       │
                            │  - code (opt)    │
                            │  - details (opt) │
                            └──────────────────┘
                                     △
                                     │ ALL ERRORS


┌────────────────┐         ┌────────────────┐         ┌────────────────┐
│   USER         │         │   TASK         │         │   VOICE DRAFT  │
│ - id           │         │ - id           │         │ - title        │
│ - name         │         │ - title        │         │ - description  │
│ - rating       │         │ - description  │         │ - location     │
│ - location     │         │ - location     │         │ - price        │
│ ✗ NO: password │         │ - price        │      ┌──│ - scheduledAt  │
│ ✗ NO: email    │         │ - distanceKm   │      │  │ - executionMode│
│ ✗ NO: phone    │         │ - scheduledAt  │      │  └────────────────┘
└────────────────┘         │ - executionMode│ CREATES
     △ △                   │ - acceptedAt?  │ TO
     │ │ appears in        └────────────────┘ CREATE
     │ │ task & chat              △ △
     │ │                          │ │
     │ │   ┌──────────────────────┘ └────────┐
     │ │   │                                  │
     │ │   POSTED BY                          SCHEDULED FOR
     │ │   (postedByUserId)                   (scheduledAt time)
     │ │   (postedByName)
     │ │
     │ │   ┌────────────────┐
     │ │   │   CHAT         │
     │ │   │ - chatId       │
     │ │   │ - taskId ───────────────> LINKS TO TASK
     │ │   │ - taskTitle    │
     │ │   │ - taskOwnerUserId ──────┐
     │ │   │ - taskOwnerName         │
     │ │   │ - users[] ──────────────┼──> CONTAINS USERS (User contract)
     │ │   │ - lastMessage  │        │
     │ │   └────────────────┘        │
     │ │                             │
     │ └─────────────────────────────┘
     │
     └─────────────────────────────────┐
                                       │CONTAINS
                   ┌───────────────────────────────┐
                   │     MESSAGE                   │
                   │ - id                          │
                   │ - chatId ──────────> BELONGS TO CHAT
                   │ - taskId ──────────> REFERENCES TASK
                   │ - senderId ────────┐
                   │ - text             │ POINTS TO USER (senderId)
                   │ - timestamp (ISO)  │
                   └───────────────────────────────┘
```

## Data Flow

### Task Creation Flow

```
┌──────────────────┐
│ Voice Transcript │
└────────┬─────────┘
         │ POST /v1/voice/parse-task
         ↓
┌──────────────────────┐
│  VOICE DRAFT         │ ← AI extracts: title, description, location,
│  Contract Response   │   price, scheduledAt, executionMode
└────────┬─────────────┘
         │ User reviews & adjusts
         │
         ↓
    POST /v1/tasks
         │
         ↓
┌──────────────────────┐
│  TASK                │ ← Contract enforces required fields
│  Contract Response   │   and sensitive data handling
└──────────────────────┘
```

### Chat Creation Flow

```
┌──────────────────┐
│  TASK            │ (already exists)
└────────┬─────────┘
         │ User clicks "Accept Task"
         ↓
    POST /v1/chats
         │ Accepts taskId
         │
         ↓
┌──────────────────────┐
│  CHAT                │ ← Contract gathers:
│  Contract Response   │   - Task owner info
│                      │   - All participant users
│                      │   - Last message preview
└────────┬─────────────┘
         │
         │ POST /v1/chats/{chatId}/messages
         │
         ↓
┌──────────────────────┐
│  MESSAGE             │ ← Each message follows contract
│  Contract Response   │   with timestamps in ISO-8601
└──────────────────────┘
```

## Security Boundaries

### What Leaves the API ✓

```
User Data:
  ✓ id              → Used to link/identify
  ✓ name            → Display in UI
  ✓ rating          → Show quality signal
  ✓ location        → City/area level

Task Data:
  ✓ All details     → Complete task info
  ✓ postedByName    → Credit task creator
  ✓ scheduledAt     → ISO-8601 timestamp

Message Data:
  ✓ All fields      → Complete message chain
```

### What NEVER Leaves the API ✗

```
User Data:
  ✗ password        → NEVER included
  ✗ email           → NEVER included
  ✗ phone           → NEVER included
  ✗ address         → NEVER included (use location instead)
  ✗ credit card     → NEVER included
  ✗ auth tokens     → NEVER included
```

## Contract Validation Rules

### User Contract

```javascript
// ✓ VALID
{
  id: "u_123",
  name: "Alice",
  rating: 4.5,
  location: "San Francisco"
}

// ✗ INVALID - has password
{
  id: "u_123",
  name: "Alice",
  rating: 4.5,
  location: "San Francisco",
  password: "secret" ← SECURITY VIOLATION!
}
```

### Task Contract

```javascript
// ✓ VALID
{
  id: "t_456",
  postedByUserId: "u_123",
  postedByName: "Alice",
  title: "Grocery shopping",
  description: "Pick up groceries from Whole Foods",
  location: "San Francisco",
  price: 25,
  distanceKm: 2.5,
  scheduledAt: "2024-01-15T14:30:00Z",
  executionMode: "offline"
}

// ✗ INVALID - wrong timestamp format
{
  id: "t_456",
  // ... other fields ...
  scheduledAt: "2024-01-15 14:30:00" ← Should be ISO-8601!
}

// ✗ INVALID - wrong executionMode value
{
  id: "t_456",
  // ... other fields ...
  executionMode: "part-time" ← Should be "online" or "offline"!
}
```

### Message Contract

```javascript
// ✓ VALID
{
  id: "m_789",
  chatId: "c_1011",
  taskId: "t_456",
  senderId: "u_123",
  text: "I'll pick these up right away!",
  timestamp: "2024-01-15T14:31:22Z"
}

// ✗ INVALID - timestamp not ISO-8601
{
  id: "m_789",
  chatId: "c_1011",
  taskId: "t_456",
  senderId: "u_123",
  text: "I'll pick these up right away!",
  timestamp: 1705316482000 ← Unix timestamp, should be ISO-8601!
}
```

## Error Contract

All errors follow the same format:

```javascript
// ✓ VALID
{
  message: "Task not found"
}

{
  message: "Invalid task data",
  code: "VALIDATION_ERROR",
  details: {
    field: "price",
    issue: "must be positive"
  }
}

// ✗ INVALID - inconsistent field names
{
  messageText: "..." ← Should be "message"!
}

{
  error: "..." ← Should be "message"!
}

{
  msg: "..." ← Should be "message"!
}
```

## Versioning Strategy

### Current Version: v1

All endpoints are `/v1/*`

### When Contracts Change

1. **Non-breaking changes** (adding optional fields):
   - Increment patch version
   - Example: v1.0.1 → v1.0.2
   - Old clients continue to work

2. **Breaking changes** (removing/renaming fields):
   - Increment minor version
   - Example: v1.0.0 → v2.0.0
   - Create new endpoints
   - Provide migration guide

3. **Examples of breaking changes**:
   - Removing `executionMode` from Task
   - Renaming `postedByName` to `posterName`
   - Changing timestamp format
   - Removing a required field

## Testing

### Contract Tests Cover

- ✓ Required fields present
- ✓ Field types correct
- ✓ Sensitive data absent
- ✓ Timestamp format valid
- ✓ Enum values valid
- ✓ Error format consistent

### Run Tests

```bash
npm test -- tests/contracts.test.js
```

### Add New Contract Test

```javascript
describe('MyEntity contract', () => {
  test('should have required fields', () => {
    const result = getEntity();
    expect(result).toHaveProperty('requiredField');
    expect(typeof result.requiredField).toBe('expectedType');
  });

  test('should not leak sensitive data', () => {
    const result = getEntity();
    expect(result).not.toHaveProperty('password');
  });
});
```

## Key Takeaways

1. **Contracts are a contract**: Breaking them is breaking changes
2. **Security first**: Never return sensitive data
3. **Consistency matters**: All APIs use same format
4. **Timestamp standard**: Always ISO-8601
5. **Enum values**: Use restricted values for reliability
6. **Documentation**: Tests are the truth
7. **Testing**: Contract tests catch issues early

---

For detailed specifications, see [test-contracts.md](./test-contracts.md)
For testing guide, see [README.md](./README.md)
