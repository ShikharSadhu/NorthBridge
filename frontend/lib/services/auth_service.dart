import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/api_service.dart';
import 'package:frontend/services/test_data/user_test_data.dart';

class AuthService {
  AuthService({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  static List<Map<String, dynamic>> _userStore = userPreviewApiResponse
      .map((user) => Map<String, dynamic>.from(user))
      .toList();
  static final Map<String, String> _credentialStore = {
    'aarav@northbridge.app': 'pass1234',
    'meera@northbridge.app': 'pass1234',
    'rohan@northbridge.app': 'pass1234',
    'nisha@northbridge.app': 'pass1234',
  };

  UserModel? _currentUser;

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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      _currentUser ??= userPreviewApiResponse.isEmpty
          ? null
          : UserModel.fromJson(userPreviewApiResponse.first);
      return _currentUser;
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 180));

      final userJson = _userStore.firstWhere(
        (user) => user['id'] == userId,
        orElse: () => const <String, dynamic>{},
      );
      if (userJson.isEmpty) {
        return null;
      }

      return UserModel.fromJson(userJson);
    }
  }

  Future<UserModel?> signInMock() async {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      if (userPreviewApiResponse.isEmpty) {
        _currentUser = null;
        return null;
      }

      _currentUser = UserModel.fromJson(userPreviewApiResponse.first);
      return _currentUser;
    }
  }

  Future<UserModel?> signInWithCredentials({
    required String email,
    required String password,
  }) async {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 260));

      final normalizedEmail = email.trim().toLowerCase();
      final matchedPassword = _credentialStore[normalizedEmail];
      if (matchedPassword == null || matchedPassword != password) {
        return null;
      }

      final userJson = _userStore.firstWhere(
        (user) => (user['email'] as String?) == normalizedEmail,
        orElse: () => const <String, dynamic>{},
      );
      if (userJson.isEmpty) {
        return null;
      }

      _currentUser = UserModel.fromJson(userJson);
      return _currentUser;
    }
  }

  Future<UserModel> signUpWithCredentials({
    required String name,
    required String location,
    required String email,
    required String password,
  }) async {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 300));

      final normalizedEmail = email.trim().toLowerCase();
      if (_credentialStore.containsKey(normalizedEmail)) {
        throw Exception('Email already exists');
      }

      final user = UserModel(
        id: 'u_${DateTime.now().millisecondsSinceEpoch}',
        name: name.trim(),
        bio: '',
        rating: 0,
        tasksDone: 0,
        location: location.trim(),
        phoneNumber: '',
        email: normalizedEmail,
        skills: const [],
        profileImageUrl: '',
        privatePaymentQrDataUrl: '',
      );

      _credentialStore[normalizedEmail] = password;
      _userStore = [
        ..._userStore,
        {
          ...user.toJson(),
          'email': normalizedEmail,
        }
      ];
      _currentUser = user;
      return user;
    }
  }

  Future<void> signOutMock() async {
    try {
      await _apiService.postJson('/v1/auth/logout');
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 180));
    }
    _currentUser = null;
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
    try {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 280));

      final current = _currentUser;
      if (current == null) {
        return null;
      }

      final updated = current.copyWith(
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        skills: skills,
        profileImageUrl: profileImageUrl.trim(),
        privatePaymentQrDataUrl: privatePaymentQrDataUrl.trim(),
      );

      final userIndex = _userStore.indexWhere((user) => user['id'] == current.id);
      if (userIndex >= 0) {
        final updatedJson = {
          ...updated.toJson(),
          'email': updated.email,
        };
        final next = List<Map<String, dynamic>>.from(_userStore);
        next[userIndex] = updatedJson;
        _userStore = next;
      }

      _currentUser = updated;
      return _currentUser;
    }
  }

  Future<UserModel?> submitRatingForUser({
    required String targetUserId,
    required double rating,
  }) async {
    try {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 220));

      if (rating < 1 || rating > 5) {
        return null;
      }

      final userIndex = _userStore.indexWhere((user) => user['id'] == targetUserId);
      if (userIndex < 0) {
        return null;
      }

      final current = UserModel.fromJson(_userStore[userIndex]);
      final ratedCount = current.tasksDone;
      final totalScore = current.rating * ratedCount;
      final updatedRating = (totalScore + rating) / (ratedCount + 1);

      final updated = current.copyWith(
        rating: updatedRating,
        tasksDone: ratedCount + 1,
      );

      final next = List<Map<String, dynamic>>.from(_userStore);
      next[userIndex] = updated.toJson();
      _userStore = next;

      if (_currentUser?.id == targetUserId) {
        _currentUser = updated;
      }

      return updated;
    }
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
