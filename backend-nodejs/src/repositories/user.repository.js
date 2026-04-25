const {getRequiredFirestoreDb} = require('../config/firebase');
const {toPublicUser, toPrivateUser, cloneAuthUser, normalizeString} = require('../models/user.model');
const {buildPrefixedId} = require('../utils/id.util');

function normalizeSkills(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry) => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function normalizeUserRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		id: normalizeString(record.id),
		name: normalizeString(record.name),
		bio: normalizeString(record.bio),
		rating: typeof record.rating === 'number' ? record.rating : 0,
		tasksDone: typeof record.tasksDone === 'number' ? record.tasksDone : 0,
		location: normalizeString(record.location),
		phoneNumber: normalizeString(record.phoneNumber),
		email: normalizeString(record.email).toLowerCase(),
		skills: normalizeSkills(record.skills),
		profileImageUrl: normalizeString(record.profileImageUrl),
		privatePaymentQrDataUrl: normalizeString(record.privatePaymentQrDataUrl),
		password: typeof record.password === 'string' ? record.password : '',
	};
}

async function listUserRecords() {
	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('users').get();
	return snapshot.docs.map((doc) => normalizeUserRecord({id: doc.id, ...doc.data()}));
}

async function getUserRecordById(userId) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('users').doc(normalizedUserId).get();
	if (!snapshot.exists) {
		return null;
	}

	return normalizeUserRecord({id: snapshot.id, ...snapshot.data()});
}

async function listPublicUsers() {
	const users = await listUserRecords();
	return users.map((user) => toPublicUser(user));
}

async function listAuthUsers() {
	const users = await listUserRecords();
	return users.map((user) => cloneAuthUser(user));
}

async function findUserByEmail(email) {
	const normalizedEmail = normalizeString(email).toLowerCase();
	if (!normalizedEmail) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
	if (snapshot.empty) {
		return null;
	}

	const document = snapshot.docs[0];
	return cloneAuthUser(normalizeUserRecord({id: document.id, ...document.data()}));
}

async function getAuthUserById(userId) {
	return cloneAuthUser(await getUserRecordById(userId));
}

async function getPublicUserById(userId) {
	return toPublicUser(await getAuthUserById(userId));
}

async function getPrivateUserById(userId) {
	const authUser = await getAuthUserById(userId);
	return toPrivateUser(authUser);
}

async function upsertUserFromAuth(input = {}) {
	const normalizedUserId = normalizeString(input.userId);
	if (!normalizedUserId) {
		return {
			created: false,
			user: null,
		};
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('users').doc(normalizedUserId);
	const snapshot = await ref.get();

	const updates = {};
	if (typeof input.name === 'string' && input.name.trim()) {
		updates.name = normalizeString(input.name);
	}
	if (typeof input.email === 'string' && input.email.trim()) {
		updates.email = normalizeString(input.email).toLowerCase();
	}
	if (typeof input.location === 'string' && input.location.trim()) {
		updates.location = normalizeString(input.location);
	}

	if (!snapshot.exists) {
		const created = normalizeUserRecord({
			id: normalizedUserId,
			name: updates.name || 'NorthBridge User',
			bio: '',
			rating: 0,
			tasksDone: 0,
			location: updates.location || '',
			phoneNumber: '',
			email: updates.email || '',
			skills: [],
			profileImageUrl: '',
			privatePaymentQrDataUrl: '',
			password: '',
		});

		await ref.set(created, {merge: false});
		return {
			created: true,
			user: toPublicUser(created),
		};
	}

	if (Object.keys(updates).length > 0) {
		await ref.set(updates, {merge: true});
	}

	const current = normalizeUserRecord({id: snapshot.id, ...snapshot.data(), ...updates});
	return {
		created: false,
		user: toPublicUser(current),
	};
}

async function createUser(input = {}) {
	const normalizedEmail = normalizeString(input.email).toLowerCase();
	const password = typeof input.password === 'string' ? input.password : '';
	const created = normalizeUserRecord({
		id: buildPrefixedId('u'),
		name: normalizeString(input.name) || 'NorthBridge User',
		bio: '',
		rating: 0,
		tasksDone: 0,
		location: normalizeString(input.location),
		phoneNumber: '',
		email: normalizedEmail,
		skills: [],
		profileImageUrl: '',
		privatePaymentQrDataUrl: '',
		password,
	});

	const db = getRequiredFirestoreDb();
	await db.collection('users').doc(created.id).set(created, {merge: false});
	return cloneAuthUser(created);
}

async function updateUserProfile(userId, input = {}) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('users').doc(normalizedUserId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const updates = {};
	if (typeof input.name === 'string' && input.name.trim()) {
		updates.name = normalizeString(input.name);
	}
	if (typeof input.location === 'string' && input.location.trim()) {
		updates.location = normalizeString(input.location);
	}
	if (typeof input.email === 'string' && input.email.trim()) {
		updates.email = normalizeString(input.email).toLowerCase();
	}
	if (typeof input.bio === 'string') {
		updates.bio = normalizeString(input.bio);
	}
	if (typeof input.phoneNumber === 'string') {
		updates.phoneNumber = normalizeString(input.phoneNumber);
	}
	if (Array.isArray(input.skills)) {
		updates.skills = normalizeSkills(input.skills);
	}
	if (typeof input.profileImageUrl === 'string') {
		updates.profileImageUrl = normalizeString(input.profileImageUrl);
	}
	if (typeof input.privatePaymentQrDataUrl === 'string') {
		updates.privatePaymentQrDataUrl = normalizeString(input.privatePaymentQrDataUrl);
	}

	if (Object.keys(updates).length > 0) {
		await ref.set(updates, {merge: true});
	}

	return toPrivateUser(normalizeUserRecord({id: snapshot.id, ...snapshot.data(), ...updates}));
}

async function submitRatingForUser(userId, rating) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('users').doc(normalizedUserId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const current = normalizeUserRecord({id: snapshot.id, ...snapshot.data()});
	const ratedCount = current.tasksDone;
	const totalScore = current.rating * ratedCount;
	const updates = {
		rating: (totalScore + Number(rating)) / (ratedCount + 1),
		tasksDone: ratedCount + 1,
	};

	await ref.set(updates, {merge: true});
	return toPublicUser(normalizeUserRecord({id: snapshot.id, ...snapshot.data(), ...updates}));
}

module.exports = {
	listPublicUsers,
	listAuthUsers,
	findUserByEmail,
	getAuthUserById,
	getPublicUserById,
	getPrivateUserById,
	createUser,
	upsertUserFromAuth,
	updateUserProfile,
	submitRatingForUser,
};
