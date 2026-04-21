import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/api_service.dart';

class AuthService {
  AuthService({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  static List<Map<String, dynamic>> _userStore = const [];

  UserModel? _currentUser;

  void setSessionToken(String? idToken) {
    ApiService.setGlobalBearerToken(idToken);
  }

  void clearSessionToken() {
    ApiService.setGlobalBearerToken(null);
  }

  Future<UserModel?> getCurrentUser() async {
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
    if (idToken != null && idToken.trim().isNotEmpty) {
      setSessionToken(idToken);
    }

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
    required String idToken,
  }) async {
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
    required String idToken,
  }) async {
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
