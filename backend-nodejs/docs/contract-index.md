# API Contract Testing Documentation Index

Welcome to the API Contract Testing section. This comprehensive guide ensures that all API responses maintain consistent, secure data shapes.

## Quick Start

**For API Developers:**
1. Read [contract-compliance.md](./contract-compliance.md) before adding/modifying endpoints
2. Use the checklist to ensure your response matches the contract
3. Write contract tests in `tests/contracts.test.js`
4. Run: `npm test -- tests/contracts.test.js`

**For Frontend Developers:**
1. Read [test-contracts.md](./test-contracts.md) to understand what data you'll receive
2. Use the schemas as your source of truth
3. Validate incoming data according to the contracts

**For Code Reviewers:**
1. Check the "Code Review Checklist" in [contract-compliance.md](./contract-compliance.md)
2. Verify contract tests are included and passing
3. Ensure sensitive data is not included in responses

## Documentation Files

### 1. **[test-contracts.md](./test-contracts.md)** — Complete Contract Specifications
   - Detailed schemas for all data types
   - Field requirements and types
   - Real examples for each contract
   - Data type standards
   - Validation best practices

   **Use this when:**
   - You need exact field names and types
   - You're building frontend that consumes the API
   - You want to understand what data to expect

### 2. **[contract-architecture.md](./contract-architecture.md)** — Visual Architecture & Relationships
   - Diagram showing how contracts relate
   - Data flow through the system
   - Security boundaries
   - Validation rules with examples
   - Versioning strategy

   **Use this when:**
   - You want to understand how contracts fit together
   - You need to see the big picture
   - You're debugging unexpected errors

### 3. **[contract-compliance.md](./contract-compliance.md)** — Developer Checklist & Best Practices
   - Step-by-step checklist for new endpoints
   - Code patterns for each contract type
   - Testing guidelines
   - Common mistakes and how to fix them
   - Code review checklist

   **Use this when:**
   - You're adding a new API endpoint
   - You're fixing an endpoint
   - You're reviewing code for contract compliance

### 4. **[../../tests/README.md](../../tests/README.md)** — Testing Guide
   - How to run tests
   - Test categories (unit, integration, contract)
   - Why contract tests matter
   - Test templates for new tests
   - Debugging tips

   **Use this when:**
   - You need to run or write tests
   - You want to understand test structure
   - You're debugging test failures

### 5. **[../../tests/contracts.test.js](../../tests/contracts.test.js)** — Test Suite
   - Executable contract tests
   - Snapshot tests for all data shapes
   - Validation of field types
   - Security validation (no sensitive data)

   **Use this when:**
   - You want to see actual tests
   - Running: `npm test -- tests/contracts.test.js`
   - You're adding new contract tests

## Contract Summary

### Contracts Defined

| Contract | Key Fields | Since | Status |
|----------|-----------|-------|--------|
| **User** | id, name, rating, location | v1.0 | Stable |
| **Task** | id, title, description, price, scheduledAt, executionMode | v1.0 | Stable |
| **Chat** | chatId, taskId, users[], lastMessage | v1.0 | Stable |
| **Message** | id, chatId, senderId, text, timestamp | v1.0 | Stable |
| **Voice Draft** | title, description, location, price, scheduledAt, executionMode | v1.0 | Stable |
| **Error Response** | message, code?, details? | v1.0 | Stable |

### Critical Rules

✅ **ALWAYS Include:**
- Required fields from contract
- ISO-8601 timestamps
- Enum values (online/offline)

❌ **NEVER Include:**
- Passwords or password hashes
- Emails (unless specifically authenticated)
- Phone numbers
- Full addresses (use city only)
- Stack traces
- Internal error details

## Key Principles

1. **Contracts are binding**: Breaking them is a breaking change
2. **Security first**: Never leak sensitive data
3. **Consistency matters**: All APIs use same format
4. **Tests document**: Tests are the executable specification
5. **Timestamps matter**: Always ISO-8601 format
6. **Enums matter**: Use restricted values for reliability

## Common Workflows

### ✏️ Adding a New Endpoint

1. Open [contract-compliance.md](./contract-compliance.md)
2. Choose relevant contract section
3. Follow the checklist for your response type
4. Write implementation code using provided patterns
5. Add contract tests to [../../tests/contracts.test.js](../../tests/contracts.test.js)
6. Run: `npm test -- tests/contracts.test.js`
7. Code review using "Code Review Checklist"

### 🔍 Debugging Contract Issues

1. Check [contract-architecture.md](./contract-architecture.md) for data relationships
2. Run contract tests: `npm test -- tests/contracts.test.js`
3. Check [test-contracts.md](./test-contracts.md) for exact field requirements
4. Verify timestamps are ISO-8601
5. Verify enums are correct values
6. Verify sensitive data is stripped

### 📱 Frontend Development

1. Read [test-contracts.md](./test-contracts.md)
2. Note required vs optional fields
3. Validate incoming data
4. Use schemas as source of truth
5. Report contract violations in backend issues

### 📝 Modifying Existing Contracts

1. Is it a breaking change? See "Versioning" in [contract-architecture.md](./contract-architecture.md)
2. Update [test-contracts.md](./test-contracts.md) with changes
3. Update contract tests in [../../tests/contracts.test.js](../../tests/contracts.test.js)
4. Add version/migration notes
5. Update [contract-compliance.md](./contract-compliance.md)

## Test Coverage

### Contract Tests Verify

✓ All required fields are present
✓ Field types are correct
✓ Sensitive data is NOT included
✓ Timestamps are ISO-8601
✓ Enum values are valid
✓ Error responses are consistent

### Run Tests

```bash
# Contract tests only
npm test -- tests/contracts.test.js

# All tests
npm test

# With coverage
npm test -- --coverage

# Specific test
npm test -- --testNamePattern="User contract"
```

## Structure

```
backend-nodejs/
├── docs/
│   ├── contract-architecture.md          ← Visual overview & relationships
│   ├── contract-compliance.md            ← Developer checklist
│   ├── contract-index.md                 ← This file
│   └── test-contracts.md                 ← Complete specifications
├── tests/
│   ├── README.md                         ← Testing guide
│   ├── contracts.test.js                 ← Test suite
│   ├── unit/                             ← Unit tests
│   └── integration/                      ← Integration tests
└── src/
    ├── controllers/                      ← Must return contract data
    ├── services/                         ← Must strip sensitive data
    └── routes/                           ← Must validate contracts
```

## FAQ

**Q: What if I need to return additional optional fields?**
A: Add them! Contract tests check for required fields. Optional fields don't break the contract.

**Q: What if I need to break a contract?**
A: Create v2 of the endpoint. See "Versioning" in [contract-architecture.md](./contract-architecture.md).

**Q: Should I include user email in responses?**
A: No, unless it's an authenticated request for their own profile. See "Security Boundaries" in [contract-architecture.md](./contract-architecture.md).

**Q: What timestamp format should I use?**
A: Always ISO-8601: `2024-01-15T14:30:00Z`. Use `.toISOString()` in Node.js.

**Q: Where should I check field types?**
A: See the table in each section of [test-contracts.md](./test-contracts.md).

## Contact & Questions

- 💬 **Teams/Discord**: Ask about contract questions
- 📋 **GitHub Issues**: Report contract violations
- 📚 **Documentation**: Update docs/contract-architecture.md
- ✅ **Code Review**: Use the checklist in contract-compliance.md

## Related Documentation

- [API Design Guidelines](./api-design.md)
- [Architecture Overview](../../docs/architecture.md)
- [Database Schema](./database-schema.md)
- [Testing Guide](../../tests/README.md)

---

**Last Updated**: 2024-01-15  
**Version**: v1.0  
**Status**: Active
