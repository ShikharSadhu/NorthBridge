import 'auth_session_storage_base.dart';
import 'auth_session_storage_stub.dart'
    if (dart.library.html) 'auth_session_storage_web.dart';

AuthSessionStorage createAuthSessionStorage() => createPlatformAuthSessionStorage();
