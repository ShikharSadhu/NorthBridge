const seedData = require('../../mock-data/seed-data');
const {getFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toTaskRecord, normalizeString} = require('../models/task.model');

function normalizeTaskRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		id: normalizeString(record.id),
		postedByUserId: normalizeString(record.postedByUserId),
		postedByName: normalizeString(record.postedByName),
		title: normalizeString(record.title),
		description: normalizeString(record.description),
		location: normalizeString(record.location),
		price: typeof record.price === 'number' ? record.price : 0,
		distanceKm: typeof record.distanceKm === 'number' ? record.distanceKm : 0,
		scheduledAt: normalizeString(record.scheduledAt),
		executionMode: normalizeString(record.executionMode) || 'offline',
		status: record.status === 'accepted' ? 'accepted' : 'open',
		acceptedByUserId: normalizeString(record.acceptedByUserId) || undefined,
		acceptedAt: normalizeString(record.acceptedAt) || undefined,
	};
}

async function listTaskRecords() {
	const db = getFirestoreDb();
	if (!db) {
		return seedData.tasks.map((task) => normalizeTaskRecord(task));
	}

	const snapshot = await db.collection('tasks').get();
	return snapshot.docs.map((doc) => normalizeTaskRecord({id: doc.id, ...doc.data()}));
}

async function getTaskRecordById(taskId) {
	const normalizedTaskId = normalizeString(taskId);
	if (!normalizedTaskId) {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		return normalizeTaskRecord(seedData.tasks.find((entry) => entry.id === normalizedTaskId));
	}

	const snapshot = await db.collection('tasks').doc(normalizedTaskId).get();
	if (!snapshot.exists) {
		return null;
	}

	return normalizeTaskRecord({id: snapshot.id, ...snapshot.data()});
}

async function listTasks() {
	return (await listTaskRecords()).map((task) => toTaskRecord(task));
}

async function getTaskById(taskId) {
	return toTaskRecord(await getTaskRecordById(taskId));
}

function nextTaskId() {
	return buildPrefixedId('t');
}

async function createTask(input) {
	const created = normalizeTaskRecord({
		id: nextTaskId(),
		postedByUserId: normalizeString(input.postedByUserId),
		postedByName: normalizeString(input.postedByName),
		title: normalizeString(input.title),
		description: normalizeString(input.description),
		location: normalizeString(input.location),
		price: typeof input.price === 'number' ? input.price : 0,
		distanceKm: typeof input.distanceKm === 'number' ? input.distanceKm : 0,
		scheduledAt: normalizeString(input.scheduledAt),
		executionMode: normalizeString(input.executionMode) || 'offline',
		status: input.status === 'accepted' ? 'accepted' : 'open',
		acceptedByUserId: normalizeString(input.acceptedByUserId) || undefined,
		acceptedAt: normalizeString(input.acceptedAt) || undefined,
	});

	const db = getFirestoreDb();
	if (db) {
		await db.collection('tasks').doc(created.id).set(created);
	} else {
		seedData.tasks.unshift(created);
	}

	return toTaskRecord(created);
}

async function acceptTask(taskId, acceptedByUserId) {
	const normalizedTaskId = normalizeString(taskId);
	const acceptedBy = normalizeString(acceptedByUserId);
	if (!normalizedTaskId) {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		const task = seedData.tasks.find((entry) => entry.id === normalizedTaskId);
		if (!task) {
			return null;
		}

		task.status = 'accepted';
		task.acceptedByUserId = acceptedBy;
		task.acceptedAt = new Date().toISOString();
		return toTaskRecord(normalizeTaskRecord(task));
	}

	const ref = db.collection('tasks').doc(normalizedTaskId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const updates = {
		status: 'accepted',
		acceptedByUserId: acceptedBy,
		acceptedAt: new Date().toISOString(),
	};
	await ref.set(updates, {merge: true});
	return toTaskRecord(normalizeTaskRecord({id: snapshot.id, ...snapshot.data(), ...updates}));
}

module.exports = {
	listTasks,
	getTaskById,
	nextTaskId,
	createTask,
	acceptTask,
};
