# Backend Tests

This directory contains all backend tests including unit tests, integration tests, and contract tests.

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual functions/methods
├── integration/             # Integration tests for API endpoints
├── contracts.test.js        # Data contract snapshot tests
└── README.md               # This file
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Contract tests only
npm test -- tests/contracts.test.js

# Unit tests only
npm test -- tests/unit/

# Integration tests only
npm test -- tests/integration/
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run with Coverage Report

```bash
npm test -- --coverage
```

## Test Categories

### Unit Tests (`tests/unit/`)

Unit tests verify individual functions and methods in isolation:

- **Controllers**: Test business logic in handlers
- **Services**: Test service layer functions
- **Utilities**: Test utility functions
- **Models**: Test data model methods
- **Middlewares**: Test middleware functions

**Example:**
```bash
npm test -- tests/unit/services/task.service.test.js
```

### Integration Tests (`tests/integration/`)

Integration tests verify complete API flows:

- **API Endpoints**: Test full request/response cycles
- **Database Integration**: Test data persistence
- **Authentication**: Test auth middleware and flows
- **Multi-step Workflows**: Test complex user journeys

**Example:**
```bash
npm test -- tests/integration/api/tasks.test.js
```

### Contract Tests (`tests/contracts.test.js`)

Contract tests verify that API responses match expected data shapes:

- **User Contract**: Ensures user objects have required fields
- **Task Contract**: Ensures task objects are properly formatted
- **Chat Contract**: Ensures chat responses are consistent
- **Message Contract**: Ensures messages have required fields
- **Voice Draft Contract**: Ensures voice parsing produces valid drafts
- **Error Responses**: Ensures all errors follow consistent format

**Why Contract Tests Matter:**

Contract tests serve as a contract between frontend and backend. They ensure:

1. **Consistency**: All APIs return data in the same shape
2. **Security**: Sensitive data (passwords, emails) is never returned
3. **Stability**: Breaking changes to API are caught immediately
4. **Documentation**: Tests serve as executable documentation
5. **Confidence**: Frontend developers know what to expect

**Example:**
```bash
npm test -- tests/contracts.test.js
```

## Important Data Contracts

### All Response Data Should Include

**Users:**
- `id`, `name`, `rating`, `location`
- ❌ Should NOT include: `password`, `email`, `phone`

**Tasks:**
- `id`, `postedByUserId`, `postedByName`, `title`, `description`, `location`, `price`, `distanceKm`, `scheduledAt`, `executionMode`
- ✓ Optional: `acceptedAt` (only for accepted tasks)

**Chats:**
- `chatId`, `taskId`, `taskTitle`, `taskOwnerUserId`, `taskOwnerName`, `users[]`, `lastMessage`

**Messages:**
- `id`, `chatId`, `taskId`, `senderId`, `text`, `timestamp`

**Timestamps:**
- Must be ISO-8601 format: `2024-01-15T14:30:00Z`

**Execution Modes:**
- Must be: `"online"` or `"offline"`

**Error Responses:**
- All errors must have a `message` field
- Do NOT use: `messageText`, `error`, `msg`

## Test Coverage Goals

We aim for:

- **Unit Tests**: 80%+ coverage of business logic
- **Integration Tests**: All API endpoints covered
- **Contract Tests**: 100% of response shapes

## Writing Tests

### Unit Test Template

```javascript
describe('MyFunction', () => {
  test('should do something when given valid input', () => {
    const result = myFunction({valid: 'input'});
    expect(result).toBe('expected');
  });

  test('should throw error when given invalid input', () => {
    expect(() => {
      myFunction({invalid: 'input'});
    }).toThrow();
  });
});
```

### Integration Test Template

```javascript
describe('GET /v1/tasks', () => {
  test('should return list of tasks with valid contract', () => {
    const response = request('GET', '/v1/tasks');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tasks)).toBe(true);
    
    if (response.body.tasks.length > 0) {
      const task = response.body.tasks[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('executionMode');
    }
  });
});
```

### Contract Test Template

```javascript
test('API response should match contract', () => {
  const response = getResourceFromAPI();
  
  // Check required fields
  expect(response).toHaveProperty('id');
  expect(response).toHaveProperty('name');
  
  // Check field types
  expect(typeof response.id).toBe('string');
  expect(typeof response.name).toBe('string');
  
  // Check field values
  expect(response.rating).toBeGreaterThanOrEqual(0);
  expect(response.rating).toBeLessThanOrEqual(5);
  
  // Check sensitive data is NOT included
  expect(response).not.toHaveProperty('password');
  expect(response).not.toHaveProperty('email');
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --testNamePattern="test description"
```

### Run Tests from Single File

```bash
npm test -- tests/unit/controllers/task.controller.test.js
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

### Break on Test Failure

```bash
npm test -- --bail
```

## Common Issues

### Tests Not Finding Modules

Ensure `NODE_PATH` is set correctly:
```bash
NODE_PATH=./src npm test
```

### Database Not Resetting Between Tests

Add a `beforeEach` hook to reset database:
```javascript
beforeEach(async () => {
  await database.reset();
});
```

### Async Tests Timing Out

Increase timeout for slow tests:
```javascript
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

## Continuous Integration

These tests run on every commit via CI/CD:

1. **Pre-commit**: Local tests must pass before pushing
2. **On Push**: Full test suite runs in CI system
3. **Blocking**: Failed tests prevent merge to main

## Key Principles

1. **Tests are documentation**: They show how to use the API
2. **Contracts matter**: Breaking contracts is a breaking change
3. **Always validate**: Test both happy path and error cases
4. **Keep tests fast**: Unit tests should run in milliseconds
5. **Isolate tests**: Don't share state between tests

## For More Information

- See [test-contracts.md](./test-contracts.md) for detailed data contracts
- See [api-contract.md](./api-contract.md) for API endpoint specifications
- See [architecture.md](../../docs/architecture.md) for system design

## Questions?

If you have questions about tests or contracts, please:

1. Check existing test files in `/tests/`
2. Review documentation in `/docs/`
3. Ask in code review or team discussion
