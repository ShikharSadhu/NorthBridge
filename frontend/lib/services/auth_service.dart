import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/test_data/user_test_data.dart';

class AuthService {
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
    await Future<void>.delayed(const Duration(milliseconds: 200));
    _currentUser ??= userPreviewApiResponse.isEmpty
        ? null
        : UserModel.fromJson(userPreviewApiResponse.first);
    return _currentUser;
  }

  Future<UserModel?> getUserById(String userId) async {
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

  Future<UserModel?> signInMock() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (userPreviewApiResponse.isEmpty) {
      _currentUser = null;
      return null;
    }

    _currentUser = UserModel.fromJson(userPreviewApiResponse.first);
    return _currentUser;
  }

  Future<UserModel?> signInWithCredentials({
    required String email,
    required String password,
  }) async {
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

  Future<UserModel> signUpWithCredentials({
    required String name,
    required String location,
    required String email,
    required String password,
  }) async {
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

  Future<void> signOutMock() async {
    await Future<void>.delayed(const Duration(milliseconds: 180));
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

  Future<UserModel?> submitRatingForUser({
    required String targetUserId,
    required double rating,
  }) async {
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
