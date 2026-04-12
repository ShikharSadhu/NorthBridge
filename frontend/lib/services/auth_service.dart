import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/test_data/user_test_data.dart';

class AuthService {
  UserModel? _currentUser;

  Future<UserModel?> getCurrentUser() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    _currentUser ??= userPreviewApiResponse.isEmpty
        ? null
        : UserModel.fromJson(userPreviewApiResponse.first);
    return _currentUser;
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

  Future<void> signOutMock() async {
    await Future<void>.delayed(const Duration(milliseconds: 180));
    _currentUser = null;
  }
}
