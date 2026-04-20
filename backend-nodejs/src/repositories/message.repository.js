const {getRequiredFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toMessageRecord, normalizeString} = require('../models/message.model');

function normalizeMessageRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		id: normalizeString(record.id),
		chatId: normalizeString(record.chatId),
		taskId: normalizeString(record.taskId),
		senderId: normalizeString(record.senderId),
		text: normalizeString(record.text),
		imageDataUrl: normalizeString(record.imageDataUrl) || undefined,
		isPaymentRequest: Boolean(record.isPaymentRequest),
		timestamp:
			typeof record.timestamp === 'string' && record.timestamp.trim()
				? record.timestamp.trim()
				: new Date().toISOString(),
	};
}

function parsePositiveInt(value, fallback) {
	let numeric = value;
	if (typeof value === 'string' && value.trim()) {
		numeric = Number(value);
	}

	if (!Number.isInteger(numeric) || numeric <= 0) {
		return fallback;
	}

	return numeric;
}

function sortMessagesByTimestamp(messages) {
	return [...messages].sort((left, right) => {
		const leftTime = Date.parse(left.timestamp);
		const rightTime = Date.parse(right.timestamp);
		return leftTime - rightTime;
	});
}

function paginateMessages(messages, options = {}) {
	const pageSize = parsePositiveInt(options.pageSize, 0);
	if (!pageSize) {
		return messages;
	}

	const page = parsePositiveInt(options.page, 1);
	const start = (page - 1) * pageSize;
	return messages.slice(start, start + pageSize);
}

async function listMessageRecordsByChatId(chatId, options = {}) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return [];
	}

	let records;
	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('messages').where('chatId', '==', normalizedChatId).get();
	records = snapshot.docs.map((doc) => normalizeMessageRecord({id: doc.id, ...doc.data()}));

	return paginateMessages(sortMessagesByTimestamp(records), options);
}

async function listMessagesByChatId(chatId, options = {}) {
	return (await listMessageRecordsByChatId(chatId, options)).map((message) => toMessageRecord(message));
}

async function getMessageById(messageId) {
	const normalizedMessageId = normalizeString(messageId);
	if (!normalizedMessageId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('messages').doc(normalizedMessageId).get();
	if (!snapshot.exists) {
		return null;
	}

	return toMessageRecord(normalizeMessageRecord({id: snapshot.id, ...snapshot.data()}));
}

function nextMessageId() {
	return buildPrefixedId('m');
}

async function createMessage(input) {
	const created = normalizeMessageRecord({
		id: nextMessageId(),
		chatId: normalizeString(input.chatId),
		taskId: normalizeString(input.taskId),
		senderId: normalizeString(input.senderId),
		text: normalizeString(input.text),
		imageDataUrl: normalizeString(input.imageDataUrl) || undefined,
		isPaymentRequest: Boolean(input.isPaymentRequest),
		timestamp:
			typeof input.timestamp === 'string' && input.timestamp.trim()
				? input.timestamp.trim()
				: new Date().toISOString(),
	});

	const db = getRequiredFirestoreDb();
	await db.collection('messages').doc(created.id).set(created);

	return toMessageRecord(created);
}

module.exports = {
	listMessagesByChatId,
	getMessageById,
	nextMessageId,
	createMessage,
};
