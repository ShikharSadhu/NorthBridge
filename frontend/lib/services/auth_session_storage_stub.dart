import 'auth_session_storage_base.dart';

class _NoopAuthSessionStorage implements AuthSessionStorage {
  @override
  String? read(String key) => null;

  @override
  void remove(String key) {}

  @override
  void write(String key, String value) {}
}

AuthSessionStorage createPlatformAuthSessionStorage() =>
    _NoopAuthSessionStorage();
