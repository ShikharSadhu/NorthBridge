# 📱 Frontend Architecture & File Guide (NorthBridge)

This document defines the complete frontend architecture and responsibilities of each folder and file. It is intended for both developers and AI agents working on the codebase.

---

# 🧠 High-Level Architecture

The frontend follows a **layered, modular architecture**:

```
UI (Screens + Widgets)
        ↓
State Management (Providers)
        ↓
Services (API / Firebase / Voice)
        ↓
Models (Data Structure)
```
# Data Architecture Rules:

- UI must never depend on hardcoded values
- Always use models for data representation
- Data must flow: Service → Provider → UI
- Mock data must simulate real API responses
- Future backend integration should require minimal UI changes

---

# 📂 Project Structure

```
frontend/
│
├── lib/
│   ├── main.dart
│   ├── core/
│   ├── services/
│   ├── models/
│   ├── providers/
│   ├── screens/
│   ├── widgets/
│   ├── routes/
│   └── voice/   (NEW)
│
├── pubspec.yaml
└── analysis_options.yaml
```

---

# 🚀 main.dart

### Purpose

* Entry point of the application

### Responsibilities

* Initialize app
* Configure theme
* Setup providers
* Setup routes

---

# 🧱 core/

## constants/

* Stores fixed values like:

  * Colors
  * API endpoints
  * Strings

## theme/

* Defines global UI theme
* Controls:

  * Colors
  * Typography
  * Button styles

## utils/

* Helper functions
* Examples:

  * Validators
  * Formatters
  * Date/time helpers

---

# ⚙️ services/

Handles all external communication.

## api_service.dart

* Base API handler
* Sends HTTP requests
* Handles responses and errors

## auth_service.dart

* Handles authentication
* Login, logout, session management

## task_service.dart

* Create task
* Fetch tasks
* Accept task

## chat_service.dart

* Send messages
* Listen to message streams (Firestore)

## location_service.dart

* Fetch user location
* Calculate distances

## voice_service.dart (NEW)

* Handles speech-to-text
* Starts/stops listening
* Returns recognized text

---

# 📦 models/

Defines data structure for app entities.

## user_model.dart

* Represents a user
* Fields:

  * id
  * name
  * rating
  * location

## task_model.dart

* Represents a task
* Fields:

  * title
  * description
  * price
  * status
  * location

## chat_model.dart

* Represents a chat
* Fields:

  * chatId
  * users
  * lastMessage

## message_model.dart

* Represents a message
* Fields:

  * senderId
  * text
  * timestamp

---

# 🔄 providers/

Manages application state.

## auth_provider.dart

* Holds current user state
* Listens to auth changes

## task_provider.dart

* Holds task list
* Updates UI on task changes

## chat_provider.dart

* Holds chat state
* Streams messages

---

# 📱 screens/

Contains all UI screens.

## auth/

* Login
* Signup

## home/

* Task feed
* Main dashboard

## task/

* Post task screen
* Task details screen

## chat/

* Chat UI between users

## profile/

* User profile
* Ratings display

---

# 🎤 voice/ (NEW FEATURE)

Handles voice-based task creation.

## voice_input_screen.dart

* UI for voice input
* Mic button
* Listening animation
* Displays recognized speech

## voice_preview_screen.dart

* Shows structured task JSON
* Allows editing before submission

---

# 🧩 widgets/

Reusable UI components.

## task_card.dart

* Displays task in feed

## user_avatar.dart

* Displays user profile image

## rating_widget.dart

* Displays rating stars

## mic_button.dart (NEW)

* Floating mic button

## listening_animation.dart (NEW)

* Pulse animation while recording

---

# 🔀 routes/

## app_routes.dart

* Defines navigation routes
* Maps route names to screens

---

# 📄 pubspec.yaml

### Purpose

* Manage dependencies
* Define assets
* Define fonts

---

# ⚙️ analysis_options.yaml

### Purpose

* Defines lint rules
* Maintains code quality

---

# 🤖 AI Agent Instructions

The AI agent must follow these rules:

1. Do NOT modify any files outside `frontend/`
2. Do NOT touch auto-generated files (e.g., dataconnect_generated)
3. Always build modular components
4. Follow consistent spacing and design
5. Keep UI minimal and structured
6. Test code before finalizing
7. Ask for feedback after each feature
8. Never overdesign UI
9. Ensure responsiveness (mobile + web)

---

# 🏆 Final Notes

* Keep logic in services, not UI
* Keep UI clean and predictable
* Voice feature must always allow user confirmation before posting
* Maintain separation of concerns at all times

---

End of Document
