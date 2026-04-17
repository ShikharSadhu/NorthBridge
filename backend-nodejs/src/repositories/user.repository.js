const seedData = require('../../mock-data/seed-data');
const {getFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toPublicUser, cloneAuthUser, normalizeString} = require('../models/user.model');

function normalizeUserRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		id: normalizeString(record.id),
		name: normalizeString(record.name),
		rating: typeof record.rating === 'number' ? record.rating : 0,
		location: normalizeString(record.location),
		email: normalizeString(record.email).toLowerCase(),
		password: typeof record.password === 'string' ? record.password : '',
		completedTasks: typeof record.completedTasks === 'number' ? record.completedTasks : 0,
	};
}

async function listUserRecords() {
	const db = getFirestoreDb();
	if (!db) {
		return seedData.users.map((user) => normalizeUserRecord(user));
	}

	const snapshot = await db.collection('users').get();
	return snapshot.docs.map((doc) => normalizeUserRecord({id: doc.id, ...doc.data()}));
}

async function getUserRecordById(userId) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		return normalizeUserRecord(seedData.users.find((entry) => entry.id === normalizedUserId));
	}

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

	const db = getFirestoreDb();
	if (!db) {
		const user = seedData.users.find((entry) => entry.email === normalizedEmail);
		return cloneAuthUser(normalizeUserRecord(user));
	}

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

async function authenticateUser(email, password) {
	const normalizedEmail = normalizeString(email).toLowerCase();
	if (!normalizedEmail || typeof password !== 'string') {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		const user = seedData.users.find(
			(entry) => entry.email === normalizedEmail && entry.password === password,
		);
		return toPublicUser(normalizeUserRecord(user));
	}

	const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
	if (snapshot.empty) {
		return null;
	}

	const document = snapshot.docs[0];
	const user = normalizeUserRecord({id: document.id, ...document.data()});
	if (user.password !== password) {
		return null;
	}

	return toPublicUser(user);
}

function nextUserId() {
	return buildPrefixedId('u');
}

async function createUser(input) {
	const user = {
		id: nextUserId(),
		name: normalizeString(input.name),
		rating: 0,
		location: normalizeString(input.location),
		email: normalizeString(input.email).toLowerCase(),
		password: typeof input.password === 'string' ? input.password : '',
		completedTasks: 0,
	};

	const db = getFirestoreDb();
	if (db) {
		await db.collection('users').doc(user.id).set(user);
	} else {
		seedData.users.push(user);
	}

	return toPublicUser(user);
}

async function updateUserProfile(userId, input = {}) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		const userIndex = seedData.users.findIndex((entry) => entry.id === normalizedUserId);
		if (userIndex < 0) {
			return null;
		}

		const userRecord = seedData.users[userIndex];
		if (typeof input.name === 'string' && input.name.trim()) {
			userRecord.name = normalizeString(input.name);
		}
		if (typeof input.location === 'string' && input.location.trim()) {
			userRecord.location = normalizeString(input.location);
		}
		if (typeof input.email === 'string' && input.email.trim()) {
			userRecord.email = normalizeString(input.email).toLowerCase();
		}

		return toPublicUser(userRecord);
	}

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

	if (Object.keys(updates).length > 0) {
		await ref.set(updates, {merge: true});
	}

	return toPublicUser(normalizeUserRecord({id: snapshot.id, ...snapshot.data(), ...updates}));
}

module.exports = {
	listPublicUsers,
	listAuthUsers,
	findUserByEmail,
	getAuthUserById,
	getPublicUserById,
	authenticateUser,
	nextUserId,
	createUser,
	updateUserProfile,
};
