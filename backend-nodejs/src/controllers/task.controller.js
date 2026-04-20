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

async function listTasksWithFilterController(payload = {}) {
	const result = await taskService.fetchTasks(payload);
	return {
		status: result.status,
		body: {
			tasks: result.data,
		},
	};
}

async function getMyTaskHistoryController(authUserId = '', payload = {}) {
	const result = await taskService.fetchMyTaskHistory({
		...payload,
		userId: authUserId || payload.userId,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				tasks: [],
				message: result.message,
			},
		};
	}

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

async function requestTaskCompletionController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		helperUserId: payload.helperUserId || authUserId,
	};
	const result = await taskService.requestTaskCompletionEntry(taskId, mergedPayload);
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

async function confirmTaskCompletionController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		ownerUserId: payload.ownerUserId || authUserId,
	};
	const result = await taskService.confirmTaskCompletionEntry(taskId, mergedPayload);
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

async function declineTaskCompletionController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		ownerUserId: payload.ownerUserId || authUserId,
	};
	const result = await taskService.declineTaskCompletionEntry(taskId, mergedPayload);
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

async function submitTaskRatingController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		ownerUserId: payload.ownerUserId || authUserId,
	};
	const result = await taskService.submitTaskRatingEntry(taskId, mergedPayload);
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

async function completeTaskController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		ownerUserId: payload.ownerUserId || authUserId,
	};
	const result = await taskService.completeTaskEntry(taskId, mergedPayload);
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

async function cancelTaskController(taskId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		ownerUserId: payload.ownerUserId || authUserId,
	};
	const result = await taskService.cancelTaskEntry(taskId, mergedPayload);
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

async function listChatsController(payload = {}) {
	const result = await chatService.fetchChats(payload);
	return {
		status: result.status,
		body: {
			chats: result.data,
		},
	};
}

async function getChatMessagesController(chatId, payload = {}) {
	const result = await chatService.fetchChatMessages(chatId, payload);
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

async function sendMessageController(chatId, payload = {}, authUserId = '') {
	const mergedPayload = {
		...payload,
		senderId: payload.senderId || authUserId,
	};
	const result = await chatService.createMessageEntry({
		...mergedPayload,
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

async function openOrCreateTaskChatController(payload = {}, authUserId = '') {
	const hasCreateChatContract =
		typeof payload.taskId === 'string' && typeof payload.participantUserId === 'string';

	const result = hasCreateChatContract
		? await chatService.openOrCreateChatEntry({
				taskId: payload.taskId,
				participantUserId: payload.participantUserId,
		  })
		: await chatService.openOrCreateTaskChatEntry({
				...payload,
				helperUserId: payload.helperUserId || authUserId,
		  });
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				chat: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			chat: result.data,
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
	listTasksWithFilterController,
	getMyTaskHistoryController,
	getTaskController,
	createTaskController,
	acceptTaskController,
	requestTaskCompletionController,
	confirmTaskCompletionController,
	declineTaskCompletionController,
	submitTaskRatingController,
	completeTaskController,
	cancelTaskController,
	listChatsController,
	getChatMessagesController,
	sendMessageController,
	openOrCreateTaskChatController,
	parseVoiceTaskController,
};