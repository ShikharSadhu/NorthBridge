# Contract Compliance Checklist

Use this checklist when adding new endpoints or modifying existing ones to ensure your API responses comply with the data contracts.

## Before Development

- [ ] Review relevant contract in [test-contracts.md](./test-contracts.md)
- [ ] Understand all REQUIRED fields for your endpoint
- [ ] Check if any OPTIONAL fields should be included
- [ ] Plan how to strip sensitive data
- [ ] Identify which User/Task contracts your response includes

## During Development

### Request Validation

- [ ] Validate all required input fields
- [ ] Sanitize all inputs to prevent injection
- [ ] Check user permissions before processing
- [ ] Return proper error if validation fails
- [ ] Use consistent error format (see Error Contract)

### Response Building

#### For User Objects

- [ ] Include: `id`
- [ ] Include: `name` (display name only)
- [ ] Include: `rating` (0-5 range)
- [ ] Include: `location` (city/area, not full address)
- [ ] **MUST NOT** include: `password`
- [ ] **MUST NOT** include: `email` (unless specifically authenticated request)
- [ ] **MUST NOT** include: `phone`
- [ ] **MUST NOT** include: `address`
- [ ] **MUST NOT** include: any auth tokens

**Code Pattern:**
```javascript
// Strip sensitive data before returning user
const publicUser = {
  id: user.id,
  name: user.name,
  rating: user.rating,
  location: user.location,
  // Do NOT include: password, email, phone, address, createdAt, etc.
};
```

#### For Task Objects

- [ ] Include: `id`
- [ ] Include: `postedByUserId`
- [ ] Include: `postedByName`
- [ ] Include: `title`
- [ ] Include: `description`
- [ ] Include: `location`
- [ ] Include: `price`
- [ ] Include: `distanceKm`
- [ ] Include: `scheduledAt` (ISO-8601 format)
- [ ] Include: `executionMode` (enum: "online" or "offline")
- [ ] Include: `acceptedAt` (ONLY if task is accepted, ISO-8601)
- [ ] **MUST NOT** include: user's email from task creator
- [ ] **MUST NOT** include: task creator's password
- [ ] **MUST NOT** include: sensitive task details before acceptance

**Code Pattern:**
```javascript
const taskResponse = {
  id: task.id,
  postedByUserId: task.userId,
  postedByName: user.name, // From user lookup, not including email
  title: task.title,
  description: task.description,
  location: task.location,
  price: task.price,
  distanceKm: calculateDistance(userLocation, taskLocation),
  scheduledAt: task.scheduledAt.toISOString(),
  executionMode: task.executionMode, // Must be "online" or "offline"
  ...(task.acceptedBy && {acceptedAt: task.acceptedAt.toISOString()}),
};
```

#### For Chat Objects

- [ ] Include: `chatId`
- [ ] Include: `taskId` (reference to task)
- [ ] Include: `taskTitle`
- [ ] Include: `taskOwnerUserId`
- [ ] Include: `taskOwnerName`
- [ ] Include: `users` array with User objects (no sensitive data)
- [ ] Include: `lastMessage` object with recent message
- [ ] Use User Contract for user objects in `users[]`

**Code Pattern:**
```javascript
const chatResponse = {
  chatId: chat.id,
  taskId: chat.taskId,
  taskTitle: task.title,
  taskOwnerUserId: task.userId,
  taskOwnerName: taskOwner.name,
  users: chat.participants.map(p => ({
    id: p.id,
    name: p.name,
    rating: p.rating,
    location: p.location,
  })),
  lastMessage: {
    id: lastMsg.id,
    text: lastMsg.text,
    timestamp: lastMsg.timestamp.toISOString(),
  },
};
```

#### For Message Objects

- [ ] Include: `id`
- [ ] Include: `chatId`
- [ ] Include: `taskId`
- [ ] Include: `senderId`
- [ ] Include: `text`
- [ ] Include: `timestamp` (ISO-8601 format)
- [ ] Check user has access to this chat before returning message

**Code Pattern:**
```javascript
const messageResponse = {
  id: message.id,
  chatId: message.chatId,
  taskId: message.taskId,
  senderId: message.userId,
  text: message.text,
  timestamp: message.createdAt.toISOString(),
};
```

#### For Voice Draft Objects

- [ ] Include: `title` (extracted from voice)
- [ ] Include: `description` (full description)
- [ ] Include: `location` (extracted location)
- [ ] Include: `price` (AI-estimated)
- [ ] Include: `scheduledAt` (ISO-8601)
- [ ] Include: `executionMode` (determined from context, "online" or "offline")

**Code Pattern:**
```javascript
const voiceDraftResponse = {
  draft: {
    title: extractedTitle,
    description: extractedDescription,
    location: extractedLocation,
    price: aiEstimatedPrice,
    scheduledAt: new Date(extractedTime).toISOString(),
    executionMode: determineMode(transcript), // returns "online" or "offline"
  },
};
```

#### For Error Responses

- [ ] Include: `message` (always, human-readable)
- [ ] Include: `code` (optional, stable error identifier)
- [ ] Include: `details` (optional, additional context)
- [ ] **MUST NOT** include: stack traces in production
- [ ] **MUST NOT** include: internal error details
- [ ] **MUST NOT** include: database error messages

**Code Pattern:**
```javascript
// ✓ Correct error responses
res.status(404).json({
  message: 'Task not found'
});

res.status(400).json({
  message: 'Invalid task data',
  code: 'VALIDATION_ERROR',
  details: {
    field: 'price',
    issue: 'must be a positive number',
  },
});

// ✗ Never return these
res.status(500).json({
  error: 'Database query failed: null value not allowed'
});

res.status(500).json({
  message: 'Error',
  stack: '...' // Stack traces never!
});
```

### Timestamp Handling

- [ ] All timestamps use ISO-8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- [ ] Use `.toISOString()` in Node.js
- [ ] Never use Unix timestamps (milliseconds)
- [ ] Never use custom date formats

**Valid Examples:**
```javascript
✓ "2024-01-15T14:30:00Z"
✓ "2024-01-15T14:30:00.123Z"
✓ new Date().toISOString()

✗ "2024-01-15 14:30:00"
✗ 1705316400
✗ 1705316400000
```

### Enum Values

- [ ] Verify enum values match specification
- [ ] Document all valid values
- [ ] Throw error if invalid value provided

**Valid Examples:**
```javascript
✓ executionMode: "online"
✓ executionMode: "offline"

✗ executionMode: "part-time"
✗ executionMode: "ONLINE"
✗ executionMode: "both"
```

## Testing

### Write Contract Tests

- [ ] Add test for required fields
- [ ] Add test for correct field types
- [ ] Add test that sensitive data is NOT included
- [ ] Add test for timestamp format (if applicable)
- [ ] Add test for enum values (if applicable)

**Test Template:**
```javascript
describe('GET /v1/my-endpoint', () => {
  test('should return data matching contract', () => {
    const response = request('GET', '/v1/my-endpoint');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('requiredField');
    expect(typeof response.body.requiredField).toBe('expectedType');
  });

  test('should not include sensitive data', () => {
    const response = request('GET', '/v1/my-endpoint');
    
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('email');
  });

  test('should use ISO-8601 timestamps', () => {
    const response = request('GET', '/v1/my-endpoint');
    
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    expect(isoRegex.test(response.body.timestamp)).toBe(true);
  });
});
```

### Run Contract Tests

```bash
npm test -- tests/contracts.test.js
```

### Run All Tests

```bash
npm test
```

## Code Review Checklist

### For Reviewers

Verify the following before approving:

- [ ] All required contract fields are included
- [ ] Field types match contract specification
- [ ] Sensitive data is stripped from responses
- [ ] Timestamps are ISO-8601 format
- [ ] Enum values are correct
- [ ] Error responses follow error contract
- [ ] New contract tests are added
- [ ] Contract tests pass
- [ ] No breaking changes to existing contracts
- [ ] Documentation is updated if contracts changed

## Breaking Changes

If you must make a breaking change to a contract:

1. **Document the change** in [test-contracts.md](./test-contracts.md)
2. **Create new endpoint** with v2 (or increment version)
3. **Keep old endpoint** for backward compatibility (mark deprecated)
4. **Create migration guide** for frontend developers
5. **Update tests** to cover both versions
6. **Announce deprecation** in release notes

Example PR comment:
```
⚠️ BREAKING CHANGE: Removed `postedByName` from Task contract

Migrating to v2 API (/v2/tasks):
- Use `postedByName` → now included
- Use `posterId` → renamed to `postedByUserId`

Old endpoint (/v1/tasks) will be supported until [DATE].
See migration guide: [link]
```

## Questions?

If you're unsure about a contract:

1. Check [test-contracts.md](./test-contracts.md) for specifications
2. Check [contract-architecture.md](./contract-architecture.md) for relationships
3. Look at similar endpoint implementations
4. Ask in PR review or team discussion
5. Add test to clarify requirements

## Common Mistakes

❌ **Mistake**: Returning password hash in user object
```javascript
const user = {
  id: user.id,
  name: user.name,
  passwordHash: user.passwordHash, // WRONG!
};
```

✅ **Fix**: Strip all sensitive data
```javascript
const user = {
  id: user.id,
  name: user.name,
};
```

---

❌ **Mistake**: Using custom date format
```javascript
scheduledAt: "15/01/2024 2:30pm"
```

✅ **Fix**: Use ISO-8601
```javascript
scheduledAt: "2024-01-15T14:30:00Z"
```

---

❌ **Mistake**: Returning different error format
```javascript
res.json({
  error: message,
  errorCode: code,
});
```

✅ **Fix**: Use standard error contract
```javascript
res.json({
  message: message,
  code: code,
});
```

---

❌ **Mistake**: Using non-enum execution mode
```javascript
executionMode: "part-time"
```

✅ **Fix**: Use valid enum value
```javascript
executionMode: "offline"
```

---

For full contract specifications, see [test-contracts.md](./test-contracts.md)
