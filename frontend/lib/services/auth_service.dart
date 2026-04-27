import 'dart:convert';

import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/api_service.dart';
import 'package:frontend/services/auth_session_storage.dart';
import 'package:frontend/services/auth_session_storage_base.dart';

class AuthService {
  AuthService({
    ApiService? apiService,
    AuthSessionStorage? sessionStorage,
  })  : _apiService = apiService ?? ApiService(),
        _sessionStorage = sessionStorage ?? createAuthSessionStorage() {
    _restoreSessionFromStorage();
  }

  final ApiService _apiService;
  final AuthSessionStorage _sessionStorage;

  static List<Map<String, dynamic>> _userStore = const [];
  static String? _sessionUserId;
  static const String _sessionUserIdKey = 'northbridge.session.userId';
  static const String _sessionUserKey = 'northbridge.session.user';

  UserModel? _currentUser;

  void setSessionToken(String? _idToken) {
    if (_idToken == null || _idToken.trim().isEmpty) {
      clearSessionToken();
    }
  }

  void clearSessionToken() {
    _sessionUserId = null;
    _currentUser = null;
    ApiService.setGlobalBearerToken(null);
    ApiService.setGlobalAuthOverrideHeaders(null);
    _clearPersistedSession();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    final _ = forceRefresh;
    return null;
  }

  String? getSessionUserId() {
    final sessionUserId = _sessionUserId;
    if (sessionUserId == null || sessionUserId.trim().isEmpty) {
      return null;
    }

    return sessionUserId;
  }

  void _setSessionUser(UserModel user) {
    _sessionUserId = user.id;
    _currentUser = user;
    ApiService.setGlobalBearerToken(null);
    ApiService.setGlobalAuthOverrideHeaders({
      'X-User-Id': user.id,
      if (user.email.trim().isNotEmpty) 'X-User-Email': user.email.trim(),
      if (user.name.trim().isNotEmpty) 'X-User-Name': user.name.trim(),
    });
    _upsertUserStore(user);
    _persistSessionUser(user);
  }

  void _restoreSessionFromStorage() {
    final inMemorySessionUserId = _sessionUserId;
    if (inMemorySessionUserId != null && inMemorySessionUserId.trim().isNotEmpty) {
      _restoreSessionHeaders();
      return;
    }

    final storedUserId = _sessionStorage.read(_sessionUserIdKey)?.trim();
    final storedUserJson = _sessionStorage.read(_sessionUserKey)?.trim();
    if (storedUserId == null || storedUserId.isEmpty) {
      return;
    }

    _sessionUserId = storedUserId;

    if (storedUserJson != null && storedUserJson.isNotEmpty) {
      try {
        final decoded = jsonDecode(storedUserJson);
        if (decoded is Map<String, dynamic>) {
          final restoredUser = UserModel.fromJson(decoded);
          _currentUser = restoredUser;
          _upsertUserStore(restoredUser);
        }
      } catch (_) {}
    }

    _restoreSessionHeaders();
  }

  void _persistSessionUser(UserModel user) {
    _sessionStorage.write(_sessionUserIdKey, user.id);
    _sessionStorage.write(_sessionUserKey, jsonEncode(user.toJson()));
  }

  void _clearPersistedSession() {
    _sessionStorage.remove(_sessionUserIdKey);
    _sessionStorage.remove(_sessionUserKey);
  }

  void _restoreSessionHeaders() {
    final sessionUserId = _sessionUserId;
    if (sessionUserId == null || sessionUserId.trim().isEmpty) {
      ApiService.setGlobalAuthOverrideHeaders(null);
      return;
    }

    final matchingUser = _userStore.cast<Map<String, dynamic>?>().firstWhere(
          (user) => user?['id'] == sessionUserId,
          orElse: () => null,
        );

    ApiService.setGlobalBearerToken(null);
    ApiService.setGlobalAuthOverrideHeaders({
      'X-User-Id': sessionUserId,
      if (matchingUser != null && matchingUser['email'] is String)
        'X-User-Email': (matchingUser['email'] as String).trim(),
      if (matchingUser != null && matchingUser['name'] is String)
        'X-User-Name': (matchingUser['name'] as String).trim(),
    });
  }

  Future<UserModel?> getCurrentUser() async {
    _restoreSessionFromStorage();
    if (_sessionUserId == null || _sessionUserId!.trim().isEmpty) {
      _currentUser = null;
      return null;
    }

    _restoreSessionHeaders();

    try {
      final response = await _apiService.getJson('/v1/auth/me');
      final rawUser = response['user'];
      if (rawUser is! Map) {
        _currentUser = null;
        return null;
      }

      final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
      _setSessionUser(user);
      return user;
    } on ApiException catch (error) {
      final cachedUser = _userStore.cast<Map<String, dynamic>?>().firstWhere(
            (user) => user?['id'] == _sessionUserId,
            orElse: () => null,
          );

      if (error.statusCode == 401 || error.statusCode == 404) {
        clearSessionToken();
        _currentUser = null;
        return null;
      }

      if (cachedUser != null) {
        final restoredUser = UserModel.fromJson(cachedUser);
        _setSessionUser(restoredUser);
        return restoredUser;
      }

      if (_currentUser != null) {
        return _currentUser;
      }
      rethrow;
    } catch (_) {
      final cachedUser = _userStore.cast<Map<String, dynamic>?>().firstWhere(
            (user) => user?['id'] == _sessionUserId,
            orElse: () => null,
          );
      if (cachedUser != null) {
        final restoredUser = UserModel.fromJson(cachedUser);
        _setSessionUser(restoredUser);
        return restoredUser;
      }

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
    final _ = idToken;
    return getCurrentUser();
  }

  Future<UserModel?> signInWithCredentials({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.postJson(
      '/v1/auth/login',
      body: {
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    final rawUser = response['user'];
    if (rawUser is! Map) {
      return null;
    }

    final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
    _setSessionUser(user);
    return user;
  }

  Future<UserModel> signUpWithCredentials({
    required String name,
    required String location,
    required String email,
    required String password,
  }) async {
    final response = await _apiService.postJson(
      '/v1/auth/signup',
      body: {
        'name': name.trim(),
        'location': location.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    final rawUser = response['user'];
    if (rawUser is! Map) {
      throw Exception('Invalid signup response.');
    }

    final user = UserModel.fromJson(Map<String, dynamic>.from(rawUser));
    _setSessionUser(user);
    return user;
  }

  Future<void> signOut() async {
    try {
      await _apiService.postJson('/v1/auth/logout');
    } finally {
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
    _restoreSessionHeaders();

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
    _setSessionUser(updated);
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
