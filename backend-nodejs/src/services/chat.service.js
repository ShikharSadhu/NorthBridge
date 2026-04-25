const {
	listChats,
	listChatsByUserId,
	getChatById,
	getChatByTaskAndUsers,
	createChat,
	updateChatLastMessage,
} = require('../repositories/chat.repository');
const {listMessagesByChatId, createMessage} = require('../repositories/message.repository');
const {getTaskById} = require('../repositories/task.repository');
const {
	validateSendMessagePayload,
	validateTaskChatPayload,
	validateCreateChatPayload,
	validateChatQueryPayload,
} = require('../validators/chat.validator');
const {success, failure} = require('../utils/response.util');
const eventService = require('./event.service');

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

function sortChats(chats) {
	return [...chats].sort((left, right) => {
		const leftTs = left.updatedAt || left.lastMessage?.timestamp || '';
		const rightTs = right.updatedAt || right.lastMessage?.timestamp || '';
		return Date.parse(rightTs) - Date.parse(leftTs);
	});
}

function paginateChats(chats, payload = {}) {
	const pageSize = parsePositiveInt(payload.pageSize, 0);
	if (!pageSize) {
		return chats;
	}

	const page = parsePositiveInt(payload.page, 1);
	const start = (page - 1) * pageSize;
	return chats.slice(start, start + pageSize);
}

async function fetchChats(payload = {}) {
	const queryValidation = validateChatQueryPayload(payload);
	if (!queryValidation.valid) {
		return failure(400, 'Invalid chat query parameters.');
	}

	const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
	if (!userId) {
		return failure(401, 'User is not authenticated.');
	}

	const chats = await listChatsByUserId(userId);
	return success(200, paginateChats(sortChats(chats), queryValidation.value));
}

async function fetchChatMessages(chatId, payload = {}) {
	const queryValidation = validateChatQueryPayload(payload);
	if (!queryValidation.valid) {
		return failure(400, 'Invalid chat query parameters.');
	}

	const chat = await getChatById(chatId);
	if (!chat) {
		return failure(404, 'Chat not found.');
	}

	const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
	if (!userId) {
		return failure(401, 'User is not authenticated.');
	}
	if (!chat.users.includes(userId)) {
		return failure(403, 'Only chat participants can view messages.');
	}

	return success(200, {
		chat,
		messages: await listMessagesByChatId(chatId, {
			page: queryValidation.value.page,
			pageSize: queryValidation.value.pageSize,
		}),
	});
}

async function createMessageEntry(payload = {}) {
	const validation = validateSendMessagePayload(payload);
	if (!validation.valid) {
		return failure(400, 'chatId, taskId, senderId, and text/imageDataUrl are required.');
	}

	const chat = await getChatById(validation.value.chatId);
	if (!chat) {
		return failure(404, 'Chat not found.');
	}
	if (!chat.users.includes(validation.value.senderId)) {
		return failure(403, 'Only chat participants can send messages.');
	}
	if (chat.taskId !== validation.value.taskId) {
		return failure(400, 'taskId does not match chat task.');
	}

	const message = await createMessage(validation.value);
	const updated = await updateChatLastMessage(validation.value.chatId, message);

	// Attach receiverId for convenience (the other chat participant)
	const users = Array.isArray(updated?.users) ? updated.users : [];
	const receiverId = users.find((u) => u !== message.senderId) || undefined;
	const extendedMessage = {
		...message,
		receiverId,
	};

	// Notify via websocket and notifications (non-blocking)
	Promise.resolve(eventService.notifyNewMessage(updated, extendedMessage)).catch(() => {});

	return success(201, extendedMessage);
}

async function openOrCreateTaskChatEntry(payload = {}) {
	const validation = validateTaskChatPayload(payload);
	if (!validation.valid) {
		return failure(400, 'helperUserId and task details are required.');
	}

	const {task, helperUserId} = validation.value;
	if (task.postedByUserId === helperUserId) {
		return failure(400, 'Task owner and helper cannot be the same user.');
	}

	const existingChat = await getChatByTaskAndUsers(task.id, task.postedByUserId, helperUserId);
	if (existingChat) {
		return success(200, existingChat);
	}

	const chat = await createChat({
		taskId: task.id,
		taskTitle: task.title,
		taskOwnerUserId: task.postedByUserId,
		taskOwnerName: task.postedByName,
		users: [task.postedByUserId, helperUserId],
		lastMessage: {
			id: '',
			chatId: '',
			taskId: task.id,
			senderId: task.postedByUserId,
			text: '',
			timestamp: new Date().toISOString(),
		},
	});

	const firstMessage = await createMessage({
		chatId: chat.chatId,
		taskId: task.id,
		senderId: task.postedByUserId,
		text: "Task accepted. Let's coordinate the details.",
		timestamp: new Date().toISOString(),
	});

	const updated = await updateChatLastMessage(chat.chatId, firstMessage);
	return success(201, updated);
}

async function openOrCreateChatEntry(payload = {}) {
	const validation = validateCreateChatPayload(payload);
	if (!validation.valid) {
		return failure(400, 'taskId and participantUserId are required.');
	}

	const task = await getTaskById(validation.value.taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	return openOrCreateTaskChatEntry({
		helperUserId: validation.value.participantUserId,
		task: {
			id: task.id,
			postedByUserId: task.postedByUserId,
			postedByName: task.postedByName,
			title: task.title,
		},
	});
}

module.exports = {
	fetchChats,
	fetchChatMessages,
	createMessageEntry,
	openOrCreateTaskChatEntry,
	openOrCreateChatEntry,
};
