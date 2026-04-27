import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/services/api_service.dart';
import 'package:frontend/services/auth_service.dart';
import 'package:frontend/services/auth_session_storage_base.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Map<String, dynamic> _userJson({
  required String id,
  required double rating,
  required int tasksDone,
}) {
  return {
    'id': id,
    'name': 'Helper User',
    'bio': '',
    'rating': rating,
    'tasksDone': tasksDone,
    'location': 'Campus',
    'phoneNumber': '',
    'email': 'helper@example.com',
    'skills': const <String>[],
    'profileImageUrl': '',
    'privatePaymentQrDataUrl': '',
  };
}

class _MemorySessionStorage implements AuthSessionStorage {
  final Map<String, String> _values = {};

  @override
  String? read(String key) => _values[key];

  @override
  void remove(String key) {
    _values.remove(key);
  }

  @override
  void write(String key, String value) {
    _values[key] = value;
  }
}

void main() {
  group('AuthService current user refresh', () {
    setUp(() {
      AuthService(sessionStorage: _MemorySessionStorage()).clearSessionToken();
    });

    test('refreshes cached signed-in user from /v1/auth/me', () async {
      var authMeCalls = 0;
      var serverRating = 4.0;
      var serverTasksDone = 1;
      const userId = 'helper-refresh-case';

      final api = ApiService(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          if (request.method == 'POST' && request.url.path == '/v1/auth/login') {
            return http.Response(
              jsonEncode({'user': _userJson(id: userId, rating: 4.0, tasksDone: 1)}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }

          if (request.method == 'GET' && request.url.path == '/v1/auth/me') {
            authMeCalls += 1;
            return http.Response(
              jsonEncode({
                'user': _userJson(
                  id: userId,
                  rating: serverRating,
                  tasksDone: serverTasksDone,
                ),
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }

          return http.Response('{"message":"Not found"}', 404);
        }),
      );

      final auth = AuthService(apiService: api);
      final signedIn = await auth.signInWithCredentials(
        email: 'helper@example.com',
        password: 'secret123',
      );

      expect(signedIn, isNotNull);
      expect(signedIn!.rating, 4.0);
      expect(signedIn.tasksDone, 1);

      serverRating = 3.5;
      serverTasksDone = 2;

      final refreshed = await auth.getCurrentUser();

      expect(authMeCalls, 1);
      expect(refreshed, isNotNull);
      expect(refreshed!.rating, 3.5);
      expect(refreshed.tasksDone, 2);
    });

    test('restores signed-in session from browser session storage on refresh', () async {
      var authMeCalls = 0;
      const userId = 'helper-session-refresh';
      final sessionStorage = _MemorySessionStorage();

      final api = ApiService(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          if (request.method == 'POST' && request.url.path == '/v1/auth/login') {
            return http.Response(
              jsonEncode({
                'user': _userJson(id: userId, rating: 4.2, tasksDone: 3),
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }

          if (request.method == 'GET' && request.url.path == '/v1/auth/me') {
            authMeCalls += 1;
            return http.Response(
              jsonEncode({
                'user': _userJson(id: userId, rating: 4.2, tasksDone: 3),
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }

          return http.Response('{"message":"Not found"}', 404);
        }),
      );

      final firstAuth = AuthService(
        apiService: api,
        sessionStorage: sessionStorage,
      );
      final signedIn = await firstAuth.signInWithCredentials(
        email: 'helper@example.com',
        password: 'secret123',
      );

      expect(signedIn, isNotNull);
      expect(firstAuth.getSessionUserId(), userId);

      final refreshedAuth = AuthService(
        apiService: api,
        sessionStorage: sessionStorage,
      );
      expect(refreshedAuth.getSessionUserId(), userId);

      final restored = await refreshedAuth.getCurrentUser();

      expect(authMeCalls, 1);
      expect(restored, isNotNull);
      expect(restored!.id, userId);
      expect(restored.location, 'Campus');
    });
  });
}
