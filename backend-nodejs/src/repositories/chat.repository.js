const seedData = require('../../mock-data/seed-data');
const {getFirestoreDb} = require('../config/firebase');
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
		timestamp: normalizeString(record.timestamp),
	};
}

async function listChatRecords() {
	const db = getFirestoreDb();
	if (!db) {
		return seedData.chats.map((chat) => normalizeChatRecord(chat));
	}

	const snapshot = await db.collection('chats').get();
	return snapshot.docs.map((doc) => normalizeChatRecord({chatId: doc.id, ...doc.data()}));
}

async function getChatRecordById(chatId) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return null;
	}

	const db = getFirestoreDb();
	if (!db) {
		return normalizeChatRecord(seedData.chats.find((entry) => entry.chatId === normalizedChatId));
	}

	const snapshot = await db.collection('chats').doc(normalizedChatId).get();
	if (!snapshot.exists) {
		return null;
	}

	return normalizeChatRecord({chatId: snapshot.id, ...snapshot.data()});
}

async function listChats() {
	return (await listChatRecords()).map((chat) => toChatRecord(chat));
}

async function getChatById(chatId) {
	return toChatRecord(await getChatRecordById(chatId));
}

async function updateChatLastMessage(chatId, message) {
	const normalizedChatId = normalizeString(chatId);
	if (!normalizedChatId) {
		return null;
	}

	const normalizedMessage = toMessageRecord(message);
	const db = getFirestoreDb();
	if (!db) {
		const chat = seedData.chats.find((entry) => entry.chatId === normalizedChatId);
		if (!chat) {
			return null;
		}

		chat.lastMessage = normalizedMessage;
		return toChatRecord(normalizeChatRecord(chat));
	}

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

module.exports = {
	listChats,
	getChatById,
	updateChatLastMessage,
};
