import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/user_model.dart';
import 'package:frontend/services/api_service.dart';
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

  void setSessionToken(String? idToken) {
    _authService.setSessionToken(idToken);
  }

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
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        _state = ViewState<UserModel>.empty(message: error.message);
      } else {
        _state = ViewState<UserModel>.error('Unable to load user profile.');
      }
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to load user profile.');
    }

    notifyListeners();
  }

  Future<void> signInSession({
    String? idToken,
  }) async {
    _isMutating = true;
    notifyListeners();

    try {
      final user = await _authService.signInSession(idToken: idToken);
      if (user == null) {
        _state = ViewState<UserModel>.empty(message: 'No authenticated user.');
      } else {
        _state = ViewState<UserModel>.success(user);
      }
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        _state = ViewState<UserModel>.error(error.message);
      } else {
        _state = ViewState<UserModel>.error('Unable to sign in right now.');
      }
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to sign in right now.');
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _isMutating = true;
    notifyListeners();

    try {
      await _authService.signOut();
      _state = ViewState<UserModel>.empty(message: 'Signed out.');
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to sign out right now.');
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<bool> signIn({
    required String email,
    required String password,
    required String idToken,
  }) async {
    _isMutating = true;
    notifyListeners();

    try {
      final user = await _authService.signInWithCredentials(
        email: email,
        password: password,
        idToken: idToken,
      );

      if (user == null) {
        _state = ViewState<UserModel>.error('Invalid email or password.');
        return false;
      }

      _state = ViewState<UserModel>.success(user);
      return true;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        _state = ViewState<UserModel>.error(error.message);
      } else {
        _state = ViewState<UserModel>.error('Unable to sign in right now.');
      }
      return false;
    } catch (_) {
      _state = ViewState<UserModel>.error('Unable to sign in right now.');
      return false;
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<bool> signUp({
    required String name,
    required String location,
    required String email,
    required String password,
    required String idToken,
  }) async {
    _isMutating = true;
    notifyListeners();

    try {
      final user = await _authService.signUpWithCredentials(
        name: name,
        location: location,
        email: email,
        password: password,
        idToken: idToken,
      );
      _state = ViewState<UserModel>.success(user);
      return true;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        _state = ViewState<UserModel>.error(error.message);
      } else {
        _state = ViewState<UserModel>.error(
          'Unable to sign up. Try another email.',
        );
      }
      return false;
    } catch (_) {
      _state = ViewState<UserModel>.error(
        'Unable to sign up. Try another email.',
      );
      return false;
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<UserModel?> loadUserById(String userId) {
    return _authService.getUserById(userId);
  }

  Future<bool> updateProfile({
    required String name,
    required String bio,
    required String location,
    required String phoneNumber,
    required String email,
    required List<String> skills,
    required String profileImageUrl,
    required String privatePaymentQrDataUrl,
  }) async {
    _isMutating = true;
    notifyListeners();

    try {
      final updated = await _authService.updateCurrentUserProfile(
        name: name,
        bio: bio,
        location: location,
        phoneNumber: phoneNumber,
        email: email,
        skills: skills,
        profileImageUrl: profileImageUrl,
        privatePaymentQrDataUrl: privatePaymentQrDataUrl,
      );

      if (updated == null) {
        _state = ViewState<UserModel>.error(
          'No authenticated user to update profile.',
        );
        return false;
      }

      _state = ViewState<UserModel>.success(updated);
      return true;
    } catch (_) {
      _state =
          ViewState<UserModel>.error('Unable to update profile right now.');
      return false;
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }

  Future<bool> submitRatingForUser({
    required String targetUserId,
    required double rating,
  }) async {
    _isMutating = true;
    notifyListeners();

    try {
      final updated = await _authService.submitRatingForUser(
        targetUserId: targetUserId,
        rating: rating,
      );
      return updated != null;
    } catch (_) {
      return false;
    } finally {
      _isMutating = false;
      notifyListeners();
    }
  }
}
