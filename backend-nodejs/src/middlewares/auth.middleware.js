const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let firebaseAuthInitState = {
	initialized: false,
	error: null,
};

function classifyFirebaseTokenError(error) {
	const code = typeof error?.code === 'string' ? error.code : '';

	if (code.includes('id-token-expired')) {
		return {
			authErrorCode: 'token_expired',
			authErrorMessage: 'Authentication token has expired.',
		};
	}

	if (code.includes('id-token-revoked')) {
		return {
			authErrorCode: 'token_revoked',
			authErrorMessage: 'Authentication token was revoked.',
		};
	}

	if (code.includes('argument-error') || code.includes('invalid-id-token')) {
		return {
			authErrorCode: 'invalid_token',
			authErrorMessage: 'Authentication token is invalid.',
		};
	}

	return {
		authErrorCode: 'token_verification_failed',
		authErrorMessage: 'Authentication token verification failed.',
	};
}

function normalizeHeaders(headers) {
	if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
		return {};
	}

	const result = {};
	for (const [key, value] of Object.entries(headers)) {
		if (typeof value === 'string') {
			result[key.toLowerCase()] = value;
		}
	}

	return result;
}

function getAuthMode() {
	return 'firebase';
}

function parseServiceAccount(value) {
	if (!value || typeof value !== 'string') {
		return null;
	}

	try {
		return JSON.parse(value);
	} catch (_error) {
		const possiblePath = path.resolve(value);
		if (fs.existsSync(possiblePath)) {
			try {
				return JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
			} catch (_fileError) {
				return null;
			}
		}
	}

	return null;
}

function initializeFirebaseAuth() {
	if (firebaseAuthInitState.initialized) {
		return true;
	}

	try {
		if (!admin.apps.length) {
			const options = {};
			const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
			if (projectId) {
				options.projectId = projectId;
			}

			const serviceAccount = parseServiceAccount(process.env.FIREBASE_CREDENTIALS_JSON || '');
			if (serviceAccount) {
				options.credential = admin.credential.cert(serviceAccount);
			} else {
				options.credential = admin.credential.applicationDefault();
			}

			admin.initializeApp(options);
		}

		firebaseAuthInitState = {initialized: true, error: null};
		return true;
	} catch (error) {
		firebaseAuthInitState = {
			initialized: false,
			error: error instanceof Error ? error.message : 'Failed to initialize Firebase auth.',
		};
		return false;
	}
}

function extractBearerToken(headers) {
	const normalized = normalizeHeaders(headers);
	const authorization = normalized.authorization?.trim();
	if (!authorization) {
		return undefined;
	}

	const bearerPrefix = 'bearer ';
	if (!authorization.toLowerCase().startsWith(bearerPrefix)) {
		return undefined;
	}

	const token = authorization.slice(bearerPrefix.length).trim();
	return token || undefined;
}

async function extractFirebaseAuthContext(headers) {
	const token = extractBearerToken(headers);
	if (!token) {
		return {
			userId: undefined,
			email: undefined,
			name: undefined,
			tokenProvided: false,
			authErrorCode: undefined,
			authErrorMessage: undefined,
		};
	}

	if (!initializeFirebaseAuth()) {
		return {
			userId: undefined,
			email: undefined,
			name: undefined,
			tokenProvided: true,
			authErrorCode: 'firebase_unavailable',
			authErrorMessage: 'Authentication service is unavailable.',
		};
	}

	try {
		const decoded = await admin.auth().verifyIdToken(token, true);
		return {
			userId: typeof decoded.uid === 'string' ? decoded.uid : undefined,
			email: typeof decoded.email === 'string' ? decoded.email : undefined,
			name: typeof decoded.name === 'string' ? decoded.name : undefined,
			tokenProvided: true,
			authErrorCode: undefined,
			authErrorMessage: undefined,
		};
	} catch (error) {
		const classified = classifyFirebaseTokenError(error);
		return {
			userId: undefined,
			email: undefined,
			name: undefined,
			tokenProvided: true,
			authErrorCode: classified.authErrorCode,
			authErrorMessage: classified.authErrorMessage,
		};
	}
}

async function getAuthContext(input = {}) {
	const headers = input.headers || input;
	const auth = await extractFirebaseAuthContext(headers);
	const userId = auth.userId;

	return {
		authMode: getAuthMode(),
		userId,
		email: auth.email,
		name: auth.name,
		tokenProvided: Boolean(auth.tokenProvided),
		authErrorCode: auth.authErrorCode,
		authErrorMessage: auth.authErrorMessage,
		isAuthenticated: Boolean(userId),
	};
}

async function requireUser(input = {}) {
	const authContext = await getAuthContext(input);
	if (!authContext.userId) {
		const message = authContext.authErrorMessage || 'User is not authenticated.';
		return {
			ok: false,
			status: 401,
			body: {
				message,
			},
		};
	}

	return {
		ok: true,
		status: 200,
		body: {
			userId: authContext.userId,
		},
	};
}

async function authMiddleware(req, res, next) {
	const authContext = await getAuthContext(req?.headers || {});
	if (req && typeof req === 'object') {
		req.auth = authContext;
	}
	if (typeof next === 'function') {
		next();
	}
	return authContext;
}

function getAuthDiagnostics() {
	return {
		mode: getAuthMode(),
		firebaseInitialized: firebaseAuthInitState.initialized,
		firebaseInitError: firebaseAuthInitState.error,
	};
}

module.exports = {
	normalizeHeaders,
	extractUserId: async (headers) => (await extractFirebaseAuthContext(headers)).userId,
	extractBearerToken,
	extractFirebaseAuthContext,
	getAuthContext,
	requireUser,
	authMiddleware,
	getAuthDiagnostics,
	getAuthMode,
};
