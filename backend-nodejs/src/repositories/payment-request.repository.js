const {getRequiredFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {normalizeString, toPaymentRequestRecord} = require('../models/payment-request.model');

function normalizeAmount(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	return 0;
}

function normalizePaymentRequestRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	const now = new Date().toISOString();
	return {
		id: normalizeString(record.id),
		chatId: normalizeString(record.chatId),
		taskId: normalizeString(record.taskId),
		requesterUserId: normalizeString(record.requesterUserId),
		receiverUserId: normalizeString(record.receiverUserId),
		amount: normalizeAmount(record.amount),
		note: normalizeString(record.note),
		status: normalizeString(record.status) || 'pending',
		createdAt: normalizeString(record.createdAt) || now,
		updatedAt: normalizeString(record.updatedAt) || now,
		resolvedAt: normalizeString(record.resolvedAt) || undefined,
	};
}

function nextPaymentRequestId() {
	return buildPrefixedId('pr');
}

async function createPaymentRequest(input = {}) {
	const now = new Date().toISOString();
	const created = normalizePaymentRequestRecord({
		id: nextPaymentRequestId(),
		chatId: input.chatId,
		taskId: input.taskId,
		requesterUserId: input.requesterUserId,
		receiverUserId: input.receiverUserId,
		amount: input.amount,
		note: input.note,
		status: 'pending',
		createdAt: now,
		updatedAt: now,
		resolvedAt: undefined,
	});

	const db = getRequiredFirestoreDb();
	await db.collection('paymentRequests').doc(created.id).set(created);
	return toPaymentRequestRecord(created);
}

async function getPaymentRequestById(id) {
	const normalizedId = normalizeString(id);
	if (!normalizedId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('paymentRequests').doc(normalizedId).get();
	if (!snapshot.exists) {
		return null;
	}

	return toPaymentRequestRecord(normalizePaymentRequestRecord({id: snapshot.id, ...snapshot.data()}));
}

async function updatePaymentRequest(id, updates = {}) {
	const normalizedId = normalizeString(id);
	if (!normalizedId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('paymentRequests').doc(normalizedId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const normalizedUpdates = normalizePaymentRequestRecord({
		...snapshot.data(),
		...updates,
		id: normalizedId,
		updatedAt: new Date().toISOString(),
	});

	await ref.set(normalizedUpdates, {merge: true});
	return toPaymentRequestRecord(normalizedUpdates);
}

async function listPaymentRequestsByUserId(userId) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return [];
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('paymentRequests').get();
	const records = snapshot.docs
		.map((doc) => normalizePaymentRequestRecord({id: doc.id, ...doc.data()}))
		.filter(Boolean)
		.filter(
			(record) =>
				record.requesterUserId === normalizedUserId || record.receiverUserId === normalizedUserId,
		)
		.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

	return records.map((record) => toPaymentRequestRecord(record));
}

module.exports = {
	createPaymentRequest,
	getPaymentRequestById,
	updatePaymentRequest,
	listPaymentRequestsByUserId,
};
