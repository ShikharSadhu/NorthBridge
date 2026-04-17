const seedData = require('../../mock-data/seed-data');
const {getFirestoreDb} = require('../config/firebase');
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
		timestamp:
			typeof record.timestamp === 'string' && record.timestamp.trim()
				? record.timestamp.trim()
				: new Date().toISOString(),
	};
}

async function listMessageRecordsByChatId(chatId) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return [];
	}

	const db = getFirestoreDb();
	if (!db) {
		return seedData.messages
			.filter((message) => message.chatId === normalizedChatId)
			.map((message) => normalizeMessageRecord(message));
	}

	const snapshot = await db.collection('messages').where('chatId', '==', normalizedChatId).get();
	return snapshot.docs.map((doc) => normalizeMessageRecord({id: doc.id, ...doc.data()}));
}

async function listMessagesByChatId(chatId) {
	return (await listMessageRecordsByChatId(chatId)).map((message) => toMessageRecord(message));
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
		timestamp:
			typeof input.timestamp === 'string' && input.timestamp.trim()
				? input.timestamp.trim()
				: new Date().toISOString(),
	});

	const db = getFirestoreDb();
	if (db) {
		await db.collection('messages').doc(created.id).set(created);
	} else {
		seedData.messages.push(created);
	}

	return toMessageRecord(created);
}

module.exports = {
	listMessagesByChatId,
	nextMessageId,
	createMessage,
};
