const path = require('path');
const dotenv = require('dotenv');

dotenv.config({path: path.resolve(__dirname, '../../.env'), quiet: true});

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

function normalizeVoiceAiMode(value) {
	const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if (normalized === 'local-only' || normalized === 'local-first' || normalized === 'gemini-first') {
		return normalized;
	}

	return 'local-only';
}

function getEnvConfig(env = process.env) {
	const rawCorsOrigins = env.CORS_ORIGINS || '';
	const corsOrigins = rawCorsOrigins
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	return {
		nodeEnv: env.NODE_ENV || 'development',
		authMode: env.AUTH_MODE || 'firebase',
		port: toNumber(env.PORT, DEFAULT_PORT),
		corsOrigins,
		corsAllowCredentials: toBoolean(env.CORS_ALLOW_CREDENTIALS, false),
		firebaseProjectId: env.FIREBASE_PROJECT_ID || '',
		firebaseDatabaseURL: env.FIREBASE_DATABASE_URL || '',
		firebaseStorageBucket: env.FIREBASE_STORAGE_BUCKET || '',
		firebaseAppId: env.FIREBASE_APP_ID || '',
		firebaseCredentialsJson: env.FIREBASE_CREDENTIALS_JSON || '',
		googleApplicationCredentials: env.GOOGLE_APPLICATION_CREDENTIALS || '',
		voiceAiMode: normalizeVoiceAiMode(env.VOICE_AI_MODE),
		enableFirebaseEmulator: toBoolean(env.FIREBASE_EMULATOR, false),
		firestoreEmulatorHost: env.FIRESTORE_EMULATOR_HOST || '',
	};
}

const envConfig = getEnvConfig();

module.exports = {
	DEFAULT_PORT,
	toBoolean,
	normalizeVoiceAiMode,
	toNumber,
	getEnvConfig,
	envConfig,
};
