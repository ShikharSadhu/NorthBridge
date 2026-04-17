const DEFAULT_PORT = 3000;

function toNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	const normalized = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}

	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}

	return fallback;
}

function getEnvConfig(env = process.env) {
	return {
		nodeEnv: env.NODE_ENV || 'development',
		port: toNumber(env.PORT, DEFAULT_PORT),
		firebaseProjectId: env.FIREBASE_PROJECT_ID || '',
		firebaseDatabaseURL: env.FIREBASE_DATABASE_URL || '',
		firebaseStorageBucket: env.FIREBASE_STORAGE_BUCKET || '',
		firebaseAppId: env.FIREBASE_APP_ID || '',
		firebaseCredentialsJson: env.FIREBASE_CREDENTIALS_JSON || '',
		googleApplicationCredentials: env.GOOGLE_APPLICATION_CREDENTIALS || '',
		enableFirebaseEmulator: toBoolean(env.FIREBASE_EMULATOR, false),
		firestoreEmulatorHost: env.FIRESTORE_EMULATOR_HOST || '',
	};
}

const envConfig = getEnvConfig();

module.exports = {
	DEFAULT_PORT,
	toBoolean,
	toNumber,
	getEnvConfig,
	envConfig,
};
