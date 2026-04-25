import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/api_service.dart';

class AuthService {
  AuthService({
    ApiService? apiService,
    FirebaseAuth? firebaseAuth,
  })  : _apiService = apiService ?? ApiService(),
        _injectedFirebaseAuth = firebaseAuth;

  final ApiService _apiService;
  final FirebaseAuth? _injectedFirebaseAuth;
  FirebaseAuth? _firebaseAuth;

  static List<Map<String, dynamic>> _userStore = const [];

  UserModel? _currentUser;

  void setSessionToken(String? idToken) {
    ApiService.setGlobalAuthOverrideHeaders(null);
    ApiService.setGlobalBearerToken(idToken);
  }

  void clearSessionToken() {
    ApiService.setGlobalBearerToken(null);
    ApiService.setGlobalAuthOverrideHeaders(null);
  }

  Future<void> _ensureFirebaseInitialized() async {
    if (Firebase.apps.isNotEmpty) {
      return;
    }

    await Firebase.initializeApp();
  }

  Future<FirebaseAuth> _getFirebaseAuth() async {
    if (_injectedFirebaseAuth != null) {
      return _injectedFirebaseAuth!;
    }

    await _ensureFirebaseInitialized();
    _firebaseAuth ??= FirebaseAuth.instance;
    return _firebaseAuth!;
  }

  Future<String?> _resolveIdToken({bool forceRefresh = false}) async {
    try {
      final firebaseAuth = await _getFirebaseAuth();
      final user = firebaseAuth.currentUser;
      if (user == null) {
        return null;
      }

      final token = await user.getIdToken(forceRefresh);
      if (token == null || token.trim().isEmpty) {
        return null;
      }

      return token;
    } on FirebaseException {
      return null;
    } catch (_) {
      return null;
    }
  }

  String _devUserIdForEmail(String email) {
    final normalized = email.trim().toLowerCase();
    final encoded = base64Url.encode(utf8.encode(normalized)).replaceAll('=', '');
    return 'dev_${encoded.length > 28 ? encoded.substring(0, 28) : encoded}';
  }

  void _setDevAuthOverride({
    required String userId,
    required String email,
    String? name,
  }) {
    clearSessionToken();
    ApiService.setGlobalAuthOverrideHeaders({
      'X-User-Id': userId,
      'X-User-Email': email.trim().toLowerCase(),
      if (name != null && name.trim().isNotEmpty) 'X-User-Name': name.trim(),
    });
  }

  bool _canUseDevAuthFallback(Object error) {
    if (!kDebugMode) {
      return false;
    }

    if (error is FirebaseException) {
      final code = error.code.toLowerCase();
      return code.contains('not-initialized') ||
          code.contains('no-app') ||
          code.contains('options') ||
          code.contains('plugin');
    }

    final message = error.toString().toLowerCase();
    return message.contains('firebase') &&
        (message.contains('options') ||
            message.contains('no firebase app') ||
            message.contains('not been correctly initialized') ||
            message.contains('default app'));
  }

  Future<UserModel> _signUpWithDevBackendOverride({
    required String name,
    required String location,
    required String email,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final userId = _devUserIdForEmail(normalizedEmail);
    _setDevAuthOverride(userId: userId, email: normalizedEmail, name: name);

    final response = await _apiService.postJson(
      '/v1/auth/signup',
      body: {
        'name': name.trim(),
        'location': location.trim(),
        'email': normalizedEmail,
      },
    );

    final rawUser = response['user'];
    if (rawUser is! Map) {
      throw Exception('Invalid signup response.');
    }

    final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
    _currentUser = user;
    _upsertUserStore(user);
    return user;
  }

  /// Public helper to obtain the current Firebase ID token if available.
  Future<String?> getIdToken({bool forceRefresh = false}) async {
    return await _resolveIdToken(forceRefresh: forceRefresh);
  }

  Future<UserModel?> getCurrentUser() async {
    final token = await _resolveIdToken();
    if (token == null) {
      clearSessionToken();
      _currentUser = null;
      return null;
    }

    setSessionToken(token);

    try {
      final response = await _apiService.getJson('/v1/auth/me');
      final rawUser = response['user'];
      if (rawUser is! Map) {
        _currentUser = null;
        return null;
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _currentUser = user;
      _upsertUserStore(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 404) {
        if (error.statusCode == 401) {
          clearSessionToken();
        }
        _currentUser = null;
        return null;
      }

      if (_currentUser != null) {
        return _currentUser;
      }

      rethrow;
    } catch (_) {
      if (_currentUser != null) {
        return _currentUser;
      }
      rethrow;
    }
  }

  Future<UserModel?> getUserById(String userId) async {
    try {
      final response = await _apiService.getJson('/v1/users/$userId');
      final rawUser = response['user'];
      if (rawUser is! Map) {
        return null;
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _upsertUserStore(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return null;
      }

      final userJson = _userStore.firstWhere(
        (user) => user['id'] == userId,
        orElse: () => const <String, dynamic>{},
      );
      if (userJson.isNotEmpty) {
        return UserModel.fromJson(userJson);
      }
      rethrow;
    } catch (_) {
      final userJson = _userStore.firstWhere(
        (user) => user['id'] == userId,
        orElse: () => const <String, dynamic>{},
      );
      if (userJson.isEmpty) {
        rethrow;
      }

      return UserModel.fromJson(userJson);
    }
  }

  Future<UserModel?> signInSession({String? idToken}) async {
    final resolvedToken =
        (idToken != null && idToken.trim().isNotEmpty) ? idToken : await _resolveIdToken();
    if (resolvedToken == null) {
      clearSessionToken();
      return null;
    }

    setSessionToken(resolvedToken);

    try {
      final response = await _apiService.postJson('/v1/auth/login');
      final rawUser = response['user'];
      if (rawUser is! Map) {
        return null;
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _currentUser = user;
      _upsertUserStore(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        clearSessionToken();
      }
      rethrow;
    }
  }

  Future<UserModel?> signInWithCredentials({
    required String email,
    required String password,
  }) async {
    FirebaseAuth firebaseAuth;
    try {
      firebaseAuth = await _getFirebaseAuth();
    } catch (error) {
      if (_canUseDevAuthFallback(error)) {
        _setDevAuthOverride(
          userId: _devUserIdForEmail(email),
          email: email,
          name: email.split('@').first,
        );
        return await getCurrentUser();
      }
      rethrow;
    }

    final credential = await firebaseAuth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final idToken = await credential.user?.getIdToken(true);
    if (idToken == null || idToken.trim().isEmpty) {
      clearSessionToken();
      return null;
    }

    setSessionToken(idToken);
    try {
      final response = await _apiService.postJson(
        '/v1/auth/login',
        body: {
          'email': email.trim().toLowerCase(),
        },
      );
      final rawUser = response['user'];
      if (rawUser is! Map) {
        return null;
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _currentUser = user;
      _upsertUserStore(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        clearSessionToken();
      }
      rethrow;
    }
  }

  Future<UserModel> signUpWithCredentials({
    required String name,
    required String location,
    required String email,
    required String password,
  }) async {
    FirebaseAuth firebaseAuth;
    try {
      firebaseAuth = await _getFirebaseAuth();
    } catch (error) {
      if (_canUseDevAuthFallback(error)) {
        return _signUpWithDevBackendOverride(
          name: name,
          location: location,
          email: email,
        );
      }
      rethrow;
    }

    final credential = await firebaseAuth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    if (name.trim().isNotEmpty) {
      await credential.user?.updateDisplayName(name.trim());
    }

    final idToken = await credential.user?.getIdToken(true);
    if (idToken == null || idToken.trim().isEmpty) {
      throw Exception('Unable to obtain Firebase ID token.');
    }

    setSessionToken(idToken);
    try {
      final response = await _apiService.postJson(
        '/v1/auth/signup',
        body: {
          'name': name.trim(),
          'location': location.trim(),
          'email': email.trim().toLowerCase(),
        },
      );

      final rawUser = response['user'];
      if (rawUser is! Map) {
        throw Exception('Invalid signup response.');
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _currentUser = user;
      _upsertUserStore(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        clearSessionToken();
      }
      rethrow;
    }
  }

  Future<void> signOut() async {
    final firebaseAuth = await _getFirebaseAuth();
    try {
      await _apiService.postJson('/v1/auth/logout');
    } finally {
      await firebaseAuth.signOut();
      clearSessionToken();
      _currentUser = null;
    }
  }

  Future<UserModel?> updateCurrentUserProfile({
    required String name,
    required String bio,
    required String location,
    required String phoneNumber,
    required String email,
    required List<String> skills,
    required String profileImageUrl,
    required String privatePaymentQrDataUrl,
  }) async {
    final response = await _apiService.patchJson(
      '/v1/auth/me/profile',
      body: {
        'name': name.trim(),
        'bio': bio.trim(),
        'location': location.trim(),
        'phoneNumber': phoneNumber.trim(),
        'email': email.trim(),
        'skills': skills,
        'profileImageUrl': profileImageUrl.trim(),
        'privatePaymentQrDataUrl': privatePaymentQrDataUrl.trim(),
      },
    );

    final rawUser = response['user'];
    if (rawUser is! Map) {
      return null;
    }

    final updated = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
    _currentUser = updated;
    _upsertUserStore(updated);
    return updated;
  }

  Future<UserModel?> submitRatingForUser({
    required String targetUserId,
    required double rating,
  }) async {
    final response = await _apiService.postJson(
      '/v1/users/$targetUserId/rating',
      body: {
        'rating': rating,
      },
    );
    final rawUser = response['user'];
    if (rawUser is! Map) {
      return null;
    }

    final updated = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
    _upsertUserStore(updated);
    if (_currentUser?.id == targetUserId) {
      _currentUser = updated;
    }
    return updated;
  }

  void _upsertUserStore(UserModel user) {
    final index = _userStore.indexWhere((entry) => entry['id'] == user.id);
    final serialized = {
      ...user.toJson(),
      'email': user.email,
    };

    if (index < 0) {
      _userStore = [serialized, ..._userStore];
      return;
    }

    final next = List<Map<String, dynamic>>.from(_userStore);
    next[index] = serialized;
    _userStore = next;
  }
}
