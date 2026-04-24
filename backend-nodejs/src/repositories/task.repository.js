const {getRequiredFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toTaskRecord, normalizeString} = require('../models/task.model');

const taskWriteThroughCache = new Map();

function normalizeExecutionMode(value) {
	const normalized = normalizeString(value).toLowerCase();
	return normalized === 'online' ? 'online' : 'offline';
}

function normalizeIsoString(value, fallback = '') {
	const normalized = normalizeString(value);
	return normalized || fallback;
}

function normalizeGeoPoint(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}

	const lat = typeof value.lat === 'number' ? value.lat : undefined;
	const lng = typeof value.lng === 'number' ? value.lng : undefined;
	if (typeof lat !== 'number' || Number.isNaN(lat) || typeof lng !== 'number' || Number.isNaN(lng)) {
		return undefined;
	}

	return {lat, lng};
}

function normalizeTaskRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	const acceptedByUserId = normalizeString(record.acceptedByUserId) || undefined;
	const acceptedAt = normalizeString(record.acceptedAt) || undefined;
	const completionRequestedByUserId = normalizeString(record.completionRequestedByUserId) || undefined;
	const completionRequestedAt = normalizeString(record.completionRequestedAt) || undefined;
	const completedByUserId = normalizeString(record.completedByUserId) || undefined;
	const completedAt = normalizeString(record.completedAt) || undefined;
	const ratedAt = normalizeString(record.ratedAt) || undefined;

	return {
		id: normalizeString(record.id),
		postedByUserId: normalizeString(record.postedByUserId),
		postedByName: normalizeString(record.postedByName),
		title: normalizeString(record.title),
		description: normalizeString(record.description),
		location: normalizeString(record.location),
		price: typeof record.price === 'number' ? record.price : 0,
		distanceKm: typeof record.distanceKm === 'number' ? record.distanceKm : 0,
		locationGeo: normalizeGeoPoint(record.locationGeo),
		scheduledAt: normalizeIsoString(record.scheduledAt, new Date().toISOString()),
		executionMode: normalizeExecutionMode(record.executionMode),
		isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
		completionRequestedByUserId,
		completionRequestedAt,
		completedByUserId,
		completedAt,
		isRatingPending: typeof record.isRatingPending === 'boolean' ? record.isRatingPending : false,
		completionRating: typeof record.completionRating === 'number' ? record.completionRating : undefined,
		ratedAt,
		acceptedByUserId,
		acceptedAt,
		status: normalizeString(record.status) || (acceptedByUserId ? 'accepted' : 'open'),
	};
}

function upsertTaskCache(record) {
	const normalized = normalizeTaskRecord(record);
	if (!normalized || !normalized.id) {
		return null;
	}

	taskWriteThroughCache.set(normalized.id, normalized);
	return normalized;
}

function mergeWithTaskCache(records) {
	const byId = new Map();
	for (const record of records) {
		if (!record || !record.id) {
			continue;
		}
		byId.set(record.id, record);
	}

	for (const [taskId, record] of taskWriteThroughCache.entries()) {
		byId.set(taskId, record);
	}

	return Array.from(byId.values());
}

async function listTaskRecords() {
	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('tasks').get();
	const records = snapshot.docs.map((doc) => normalizeTaskRecord({id: doc.id, ...doc.data()}));
	return mergeWithTaskCache(records);
}

async function getTaskRecordById(taskId) {
	const normalizedTaskId = normalizeString(taskId);
	if (!normalizedTaskId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('tasks').doc(normalizedTaskId).get();
	if (!snapshot.exists) {
		return taskWriteThroughCache.get(normalizedTaskId) || null;
	}

	return upsertTaskCache({id: snapshot.id, ...snapshot.data()});
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
		locationGeo: normalizeGeoPoint(input.locationGeo),
		scheduledAt: normalizeIsoString(input.scheduledAt, new Date().toISOString()),
		executionMode: normalizeExecutionMode(input.executionMode),
		isActive: true,
		completionRequestedByUserId: undefined,
		completionRequestedAt: undefined,
		completedByUserId: undefined,
		completedAt: undefined,
		isRatingPending: false,
		completionRating: undefined,
		ratedAt: undefined,
		status: 'open',
		acceptedByUserId: undefined,
		acceptedAt: undefined,
	});

	const db = getRequiredFirestoreDb();
	await db.collection('tasks').doc(created.id).set(created);
	upsertTaskCache(created);

	return toTaskRecord(created);
}

async function updateTaskRecord(taskId, updates = {}) {
	const normalizedTaskId = normalizeString(taskId);
	if (!normalizedTaskId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('tasks').doc(normalizedTaskId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	await ref.set(updates, {merge: true});
	return upsertTaskCache({id: snapshot.id, ...snapshot.data(), ...updates});
}

async function acceptTask(taskId, acceptedByUserId) {
	const normalizedTaskId = normalizeString(taskId);
	const acceptedBy = normalizeString(acceptedByUserId);
	if (!normalizedTaskId) {
		return null;
	}

	const updates = {
		status: 'accepted',
		acceptedByUserId: acceptedBy,
		acceptedAt: new Date().toISOString(),
	};
	return toTaskRecord(await updateTaskRecord(normalizedTaskId, updates));
}

async function requestTaskCompletion(taskId, helperUserId) {
	const updates = {
		completionRequestedByUserId: normalizeString(helperUserId),
		completionRequestedAt: new Date().toISOString(),
	};

	return toTaskRecord(await updateTaskRecord(taskId, updates));
}

async function confirmTaskCompletion(taskId) {
	const current = await getTaskRecordById(taskId);
	if (!current) {
		return null;
	}

	const updates = {
		isActive: false,
		status: 'completed',
		completedByUserId: current.completionRequestedByUserId || current.acceptedByUserId || undefined,
		completedAt: new Date().toISOString(),
		isRatingPending: true,
		completionRequestedByUserId: null,
		completionRequestedAt: null,
	};

	return toTaskRecord(await updateTaskRecord(taskId, updates));
}

async function declineTaskCompletion(taskId) {
	const current = await getTaskRecordById(taskId);
	if (!current) {
		return null;
	}

	const updates = {
		status: current.acceptedByUserId ? 'accepted' : 'open',
		completionRequestedByUserId: null,
		completionRequestedAt: null,
	};

	return toTaskRecord(await updateTaskRecord(taskId, updates));
}

async function submitTaskRating(taskId, rating) {
	const updates = {
		completionRating: Number(rating),
		ratedAt: new Date().toISOString(),
		isRatingPending: false,
	};

	return toTaskRecord(await updateTaskRecord(taskId, updates));
}

async function cancelTask(taskId) {
	const updates = {
		isActive: false,
		status: 'cancelled',
		completionRequestedByUserId: null,
		completionRequestedAt: null,
		isRatingPending: false,
	};

	return toTaskRecord(await updateTaskRecord(taskId, updates));
}

module.exports = {
	listTasks,
	getTaskById,
	getTaskRecordById,
	nextTaskId,
	createTask,
	acceptTask,
	requestTaskCompletion,
	confirmTaskCompletion,
	declineTaskCompletion,
	submitTaskRating,
	cancelTask,
};
