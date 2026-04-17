const taskService = require('../services/task.service');
const chatService = require('../services/chat.service');
const voiceService = require('../services/voice.service');

function toEntityBody(result, entityKey) {
	if (!result.ok) {
		return {
			[entityKey]: null,
			message: result.message,
		};
	}

	return {
		[entityKey]: result.data,
	};
}

async function listTasksController() {
	const result = await taskService.fetchTasks();
	return {
		status: result.status,
		body: {
			tasks: result.data,
		},
	};
}

async function getTaskController(taskId) {
	const result = await taskService.fetchTaskById(taskId);
	return {
		status: result.status,
		body: toEntityBody(result, 'task'),
	};
}

async function createTaskController(payload = {}) {
	const result = await taskService.createTaskEntry(payload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				task: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			task: result.data,
		},
	};
}

async function acceptTaskController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		acceptedByUserId: payload.acceptedByUserId || authUserId,
	};
	const result = await taskService.acceptTaskEntry(taskId, mergedPayload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			task: result.data,
		},
	};
}

async function listChatsController() {
	const result = await chatService.fetchChats();
	return {
		status: result.status,
		body: {
			chats: result.data,
		},
	};
}

async function getChatMessagesController(chatId) {
	const result = await chatService.fetchChatMessages(chatId);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				chat: null,
				messages: [],
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: result.data,
	};
}

async function sendMessageController(chatId, payload = {}) {
	const result = await chatService.createMessageEntry({
		...payload,
		chatId,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			message: result.data,
		},
	};
}

async function parseVoiceTaskController(payload = {}) {
	const result = await voiceService.parseVoiceTask(payload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				draft: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			draft: result.data,
		},
	};
}

module.exports = {
	listTasksController,
	getTaskController,
	createTaskController,
	acceptTaskController,
	listChatsController,
	getChatMessagesController,
	sendMessageController,
	parseVoiceTaskController,
};