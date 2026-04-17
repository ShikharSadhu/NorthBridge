const {listChats, getChatById, updateChatLastMessage} = require('../repositories/chat.repository');
const {listMessagesByChatId, createMessage} = require('../repositories/message.repository');
const {validateSendMessagePayload} = require('../validators/chat.validator');
const {success, failure} = require('../utils/response.util');

function fetchChats() {
	return Promise.resolve(listChats()).then((chats) => success(200, chats));
}

async function fetchChatMessages(chatId) {
	const chat = await getChatById(chatId);
	if (!chat) {
		return failure(404, 'Chat not found.');
	}

	return success(200, {
		chat,
		messages: await listMessagesByChatId(chatId),
	});
}

async function createMessageEntry(payload = {}) {
	const validation = validateSendMessagePayload(payload);
	if (!validation.valid) {
		return failure(400, 'taskId and text are required.');
	}

	const chat = await getChatById(validation.value.chatId);
	if (!chat) {
		return failure(404, 'Chat not found.');
	}

	const message = await createMessage(validation.value);
	await updateChatLastMessage(validation.value.chatId, message);
	return success(201, message);
}

module.exports = {
	fetchChats,
	fetchChatMessages,
	createMessageEntry,
};
