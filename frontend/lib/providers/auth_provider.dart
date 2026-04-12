import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({AuthService? authService})
      : _authService = authService ?? AuthService(),
        _state = ViewState<UserModel>.loading();

  final AuthService _authService;

  ViewState<UserModel> _state;
  ViewState<UserModel> get state => _state;
  bool _isMutating = false;
  bool get isMutating => _isMutating;

  Future<void> loadCurrentUser() async {
    _state = ViewState<UserModel>.loading(previousData: _state.data);
    notifyListeners();

    try {
      final user = await _authService.getCurrentUser();
      if (user == null) {
        _state = ViewState<UserModel>.empty(message: 'No authenticated user.');
      } else {
        _state = ViewState<UserModel>.success(user);
      }
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to load user profile.');
    }

    notifyListeners();
  }

  Future<void> signInMock() async {
    _isMutating = true;
    notifyListeners();

    try {
      final user = await _authService.signInMock();
      if (user == null) {
        _state = ViewState<UserModel>.empty(message: 'No authenticated user.');
      } else {
        _state = ViewState<UserModel>.success(user);
      }
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to sign in right now.');
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<void> signOutMock() async {
    _isMutating = true;
    notifyListeners();

    try {
      await _authService.signOutMock();
      _state = ViewState<UserModel>.empty(message: 'Signed out.');
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to sign out right now.');
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }
}
