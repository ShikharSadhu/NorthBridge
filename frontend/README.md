# frontend

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## API base URL setup

Run the app with a backend URL override using dart-define:

- Android emulator:
	flutter run --dart-define=NB_API_BASE_URL=http://10.0.2.2:3000
- iOS simulator:
	flutter run --dart-define=NB_API_BASE_URL=http://127.0.0.1:3000
- Physical device:
	flutter run --dart-define=NB_API_BASE_URL=http://<your-lan-ip>:3000

If no dart-define value is provided, the app defaults to:

- Android: http://10.0.2.2:3000
- Others: http://localhost:3000
