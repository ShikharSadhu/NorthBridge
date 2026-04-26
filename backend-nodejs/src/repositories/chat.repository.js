const {getRequiredFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toChatRecord, normalizeString} = require('../models/chat.model');
const {toMessageRecord} = require('../models/message.model');

function normalizeChatRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		chatId: normalizeString(record.chatId),
		taskId: normalizeString(record.taskId),
		taskTitle: normalizeString(record.taskTitle),
		taskOwnerUserId: normalizeString(record.taskOwnerUserId),
		taskOwnerName: normalizeString(record.taskOwnerName),
		users: Array.isArray(record.users) ? record.users.filter((entry) => typeof entry === 'string') : [],
		isClosed: Boolean(record.isClosed),
		lastMessage: record.lastMessage ? toMessageRecord(record.lastMessage) : null,
		updatedAt: normalizeString(record.updatedAt) || undefined,
	};
}

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
		timestamp: normalizeString(record.timestamp),
	};
}

async function listChatRecords() {
	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('chats').get();
	return snapshot.docs.map((doc) => normalizeChatRecord({chatId: doc.id, ...doc.data()}));
}

async function getChatRecordById(chatId) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('chats').doc(normalizedChatId).get();
	if (!snapshot.exists) {
		return null;
	}

	return normalizeChatRecord({chatId: snapshot.id, ...snapshot.data()});
}

async function listChats() {
	return (await listChatRecords()).map((chat) => toChatRecord(chat));
}

async function listChatsByUserId(userId) {
	const normalizedUserId = normalizeString(userId);
	if (!normalizedUserId) {
		return [];
	}

	const chats = await listChatRecords();
	const filtered = chats.filter((chat) => Array.isArray(chat.users) && chat.users.includes(normalizedUserId));
	return filtered.map((chat) => toChatRecord(chat));
}

async function getChatById(chatId) {
	return toChatRecord(await getChatRecordById(chatId));
}

async function getChatByTaskAndUsers(taskId, firstUserId, secondUserId) {
	const normalizedTaskId = normalizeString(taskId);
	const firstUser = normalizeString(firstUserId);
	const secondUser = normalizeString(secondUserId);
	if (!normalizedTaskId || !firstUser || !secondUser) {
		return null;
	}

	const chats = await listChatRecords();
	const found = chats.find((chat) => {
		const users = Array.isArray(chat.users) ? chat.users : [];
		return chat.taskId === normalizedTaskId && users.includes(firstUser) && users.includes(secondUser);
	});

	return toChatRecord(found || null);
}

async function updateChatLastMessage(chatId, message) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return null;
	}

	const normalizedMessage = toMessageRecord(message);
	const db = getRequiredFirestoreDb();
	const ref = db.collection('chats').doc(normalizedChatId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const updates = {
		lastMessage: normalizedMessage,
		updatedAt: new Date().toISOString(),
	};
	await ref.set(updates, {merge: true});
	return toChatRecord(normalizeChatRecord({chatId: snapshot.id, ...snapshot.data(), ...updates}));
}

async function updateChat(chatId, updates = {}) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('chats').doc(normalizedChatId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const payload = {
		...updates,
		updatedAt: new Date().toISOString(),
	};
	await ref.set(payload, {merge: true});
	return toChatRecord(normalizeChatRecord({chatId: snapshot.id, ...snapshot.data(), ...payload}));
}

function nextChatId() {
	return buildPrefixedId('c');
}

async function createChat(input = {}) {
	const created = normalizeChatRecord({
		chatId: nextChatId(),
		taskId: normalizeString(input.taskId),
		taskTitle: normalizeString(input.taskTitle),
		taskOwnerUserId: normalizeString(input.taskOwnerUserId),
		taskOwnerName: normalizeString(input.taskOwnerName),
		users: Array.isArray(input.users) ? input.users.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean) : [],
		isClosed: Boolean(input.isClosed),
		lastMessage: normalizeMessageRecord(input.lastMessage),
		updatedAt: new Date().toISOString(),
	});

	const db = getRequiredFirestoreDb();
	await db.collection('chats').doc(created.chatId).set(created);

	return toChatRecord(created);
}

module.exports = {
	listChats,
	listChatsByUserId,
	getChatById,
	getChatByTaskAndUsers,
	createChat,
	updateChat,
	updateChatLastMessage,
};
