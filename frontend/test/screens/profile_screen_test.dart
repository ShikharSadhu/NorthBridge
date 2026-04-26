import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/screens/profile/profile_screen.dart';
import 'package:frontend/services/api_service.dart';
import 'package:frontend/services/auth_service.dart';
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

void main() {
  testWidgets('profile shows 3.5 rating after two completed tasks', (tester) async {
    var serverRating = 4.0;
    var serverTasksDone = 1;
    const userId = 'helper-profile-case';

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

    final provider = AuthProvider(authService: AuthService(apiService: api));

    final signedIn = await provider.signIn(
      email: 'helper@example.com',
      password: 'secret123',
    );
    expect(signedIn, isTrue);

    serverRating = 3.5;
    serverTasksDone = 2;

    await provider.loadCurrentUser();

    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(authProvider: provider),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('3.5'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
  });
}
