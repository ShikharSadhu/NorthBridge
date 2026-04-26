const {toMessageRecord} = require('./message.model');

function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function createFallbackLastMessage(chat = {}) {
	const chatId = normalizeString(chat.chatId);
	const taskId = normalizeString(chat.taskId);

	return {
		id: '',
		chatId,
		taskId,
		senderId: '',
		text: '',
		timestamp: new Date().toISOString(),
		isPaymentRequest: false,
	};
}

function toChatRecord(chat) {
	if (!chat || typeof chat !== 'object') {
		return null;
	}

	return {
		chatId: normalizeString(chat.chatId),
		taskId: normalizeString(chat.taskId),
		taskTitle: normalizeString(chat.taskTitle),
		taskOwnerUserId: normalizeString(chat.taskOwnerUserId),
		taskOwnerName: normalizeString(chat.taskOwnerName),
		users: Array.isArray(chat.users) ? chat.users.filter((entry) => typeof entry === 'string') : [],
		isClosed: Boolean(chat.isClosed),
		lastMessage: toMessageRecord(chat.lastMessage) || createFallbackLastMessage(chat),
	};
}

function isValidChatRecord(chat) {
	return Boolean(
		chat &&
			typeof chat.chatId === 'string' &&
			typeof chat.taskId === 'string' &&
			typeof chat.taskTitle === 'string' &&
			typeof chat.taskOwnerUserId === 'string' &&
			typeof chat.taskOwnerName === 'string' &&
			Array.isArray(chat.users),
	);
}

module.exports = {
	normalizeString,
	toChatRecord,
	isValidChatRecord,
};
