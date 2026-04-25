import 'package:firebase_core/firebase_core.dart';

class FirebaseEnvOptions {
  static const String apiKey = String.fromEnvironment(
    'NB_FIREBASE_API_KEY',
    defaultValue: '',
  );
  static const String appId = String.fromEnvironment(
    'NB_FIREBASE_APP_ID',
    defaultValue: '',
  );
  static const String messagingSenderId = String.fromEnvironment(
    'NB_FIREBASE_MESSAGING_SENDER_ID',
    defaultValue: '',
  );
  static const String projectId = String.fromEnvironment(
    'NB_FIREBASE_PROJECT_ID',
    defaultValue: '',
  );
  static const String authDomain = String.fromEnvironment(
    'NB_FIREBASE_AUTH_DOMAIN',
    defaultValue: '',
  );
  static const String storageBucket = String.fromEnvironment(
    'NB_FIREBASE_STORAGE_BUCKET',
    defaultValue: '',
  );
  static const String iosBundleId = String.fromEnvironment(
    'NB_FIREBASE_IOS_BUNDLE_ID',
    defaultValue: '',
  );
  static const String measurementId = String.fromEnvironment(
    'NB_FIREBASE_MEASUREMENT_ID',
    defaultValue: '',
  );

  static bool get hasRequiredValues =>
      apiKey.isNotEmpty &&
      appId.isNotEmpty &&
      messagingSenderId.isNotEmpty &&
      projectId.isNotEmpty;

  static FirebaseOptions get currentPlatform {
    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      authDomain: authDomain.isEmpty ? null : authDomain,
      storageBucket: storageBucket.isEmpty ? null : storageBucket,
      iosBundleId: iosBundleId.isEmpty ? null : iosBundleId,
      measurementId: measurementId.isEmpty ? null : measurementId,
    );
  }
}
