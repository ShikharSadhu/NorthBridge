# NorthBridge – Database & Auth Guide

This document explains how the database and authentication system works so frontend and backend can build against it without confusion.

---

# 1. Core Rule (Read This First)

**Firebase Auth UID = User Identity everywhere**

If a user’s UID is:

```
abc123
```

Then:

```
users/abc123
```

And everywhere else:

```
createdBy = "abc123"
senderId = "abc123"
```

If this is inconsistent → things will break.

---

# 2. Authentication

We are using Firebase Authentication.

## Frontend

* Log the user in
* Get UID:

```
FirebaseAuth.instance.currentUser.uid
```

## Backend

* Use the UID for all database writes
* Do NOT create your own user IDs

---

# 3. users Collection

Stores user profile data.

## Document ID

Must be the UID

## Example

```
users/abc123
```

## Fields

```json
{
  "name": "Test User",
  "rating": 4.5,
  "completedTasks": 0
}
```

## Notes

* Must create this document after signup
* Never use random IDs here

---

# 4. tasks Collection

Stores all tasks.

## Structure

```json
{
  "title": "Help move boxes",
  "price": 500,
  "status": "open",
  "createdBy": "abc123",
  "acceptedBy": null,
  "createdAt": timestamp
}
```

## Status Flow

```
open → accepted → completed
```

## Backend Responsibilities

### Create Task

* Set `status = "open"`
* Set `createdBy = UID`
* Set `acceptedBy = null`

### Accept Task

* Set `status = "accepted"`
* Set `acceptedBy = UID`

### Complete Task

* Set `status = "completed"`

---

# 5. chats Collection

Represents a conversation between two users.

## Structure

```json
{
  "users": ["abc123", "def456"],
  "lastMessage": "",
  "updatedAt": timestamp
}
```

## Notes

* `users` must contain both UIDs
* Created when a task is accepted

## Backend Responsibilities

* Create chat when task is accepted
* Update:

  * `lastMessage`
  * `updatedAt`

---

# 6. messages Collection

Stores actual chat messages.

## Structure

```json
{
  "chatId": "chat123",
  "senderId": "abc123",
  "text": "Hello",
  "createdAt": timestamp
}
```

## Notes

* One document per message
* Do NOT store full conversations in one doc

## Responsibilities

### Frontend

* Send messages

### Backend (optional)

* Update chat metadata (`lastMessage`, `updatedAt`)

---

# 7. Relationships

| Field             | Points To      |
| ----------------- | -------------- |
| tasks.createdBy   | users/{uid}    |
| tasks.acceptedBy  | users/{uid}    |
| chats.users[]     | users/{uid}    |
| messages.senderId | users/{uid}    |
| messages.chatId   | chats/{chatId} |

---

# 8. Frontend Queries

## Task Feed

```
tasks where status == "open"
order by createdAt desc
```

## User’s Tasks

```
tasks where createdBy == <uid>
```

## Chat List

```
chats where users array-contains <uid>
order by updatedAt desc
```

## Messages

```
messages where chatId == <chatId>
order by createdAt asc
```

## User Data

```
users/<uid>
```

---

# 9. Important Notes

## UIDs are NOT names

Example:

```
"createdBy": "abc123"
```

Frontend must fetch:

```
users/abc123 → get name
```

---

## Do NOT do this

❌ Store usernames instead of UID
❌ Use random IDs
❌ Mix chat + messages
❌ Skip creating user documents

---

## Do this

✅ Always use UID
✅ Keep schema consistent
✅ Follow exact field names

---

# 10. Responsibilities Summary

## Backend

* Create/update tasks correctly
* Create chats on task accept
* Maintain chat metadata

## Frontend

* Use correct queries
* Fetch user data using UID
* Use real-time listeners

## Database Owner (you)

* Keep schema consistent
* Ensure UID mapping is correct
* Maintain rules

---

# Final Line

Everything in this system depends on UID consistency.

If UID usage is correct → everything works.
If not → everything breaks.
