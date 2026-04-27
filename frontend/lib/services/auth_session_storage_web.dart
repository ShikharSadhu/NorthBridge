import 'dart:html' as html;

import 'auth_session_storage_base.dart';

class _BrowserAuthSessionStorage implements AuthSessionStorage {
  @override
  String? read(String key) => html.window.sessionStorage[key];

  @override
  void remove(String key) {
    html.window.sessionStorage.remove(key);
  }

  @override
  void write(String key, String value) {
    html.window.sessionStorage[key] = value;
  }
}

AuthSessionStorage createPlatformAuthSessionStorage() =>
    _BrowserAuthSessionStorage();
