const admin = require('firebase-admin');
const {getRequiredFirestoreDb} = require('../config/firebase');

function isFcmEnabled() {
	return process.env.ENABLE_FCM_NOTIFICATIONS === 'true';
}

function normalizeTokenList(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
}

async function getDeviceTokensForUser(userId) {
	const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
	if (!normalizedUserId) {
		return [];
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('users').doc(normalizedUserId).get();
	if (!snapshot.exists) {
		return [];
	}

	const user = snapshot.data() || {};
	return [
		...normalizeTokenList(user.fcmTokens),
		...normalizeTokenList(user.deviceTokens),
		...(typeof user.fcmToken === 'string' && user.fcmToken.trim() ? [user.fcmToken.trim()] : []),
	];
}

function toFcmMessage(payload = {}) {
	const type = typeof payload.type === 'string' ? payload.type : 'EVENT';
	const data = payload.data && typeof payload.data === 'object' ? payload.data : {};

	return {
		notification: {
			title: payload.title || 'NorthBridge update',
			body: payload.body || type,
		},
		data: {
			type,
			payload: JSON.stringify(data),
		},
	};
}

async function sendToTokens(tokens, payload) {
	if (!tokens.length || !admin.apps.length || typeof admin.messaging !== 'function') {
		return false;
	}

	const messaging = admin.messaging();
	const message = {
		tokens: Array.from(new Set(tokens)),
		...toFcmMessage(payload),
	};

	if (typeof messaging.sendEachForMulticast === 'function') {
		const result = await messaging.sendEachForMulticast(message);
		return result.successCount > 0;
	}

	if (typeof messaging.sendMulticast === 'function') {
		const result = await messaging.sendMulticast(message);
		return result.successCount > 0;
	}

	return false;
}

async function notifyUser(userId, payload) {
	if (!isFcmEnabled()) {
		return false;
	}

	try {
		const tokens = await getDeviceTokensForUser(userId);
		return await sendToTokens(tokens, payload);
	} catch (error) {
		console.warn('notifyUser failed', error && error.message);
		return false;
	}
}

async function notifyUsers(userIds, payload) {
	if (!Array.isArray(userIds) || userIds.length === 0) {
		return false;
	}

	const uniqueUserIds = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.trim())));
	const results = await Promise.all(uniqueUserIds.map((id) => notifyUser(id, payload).catch(() => false)));
	return results.some(Boolean);
}

module.exports = {
	getDeviceTokensForUser,
	notifyUser,
	notifyUsers,
};
