const taskService = require('../services/task.service');
const chatService = require('../services/chat.service');
const voiceService = require('../services/voice.service');

function resolveActorId(payloadActorId, authUserId) {
	const authId = typeof authUserId === 'string' ? authUserId.trim() : '';
	const payloadId = typeof payloadActorId === 'string' ? payloadActorId.trim() : '';

	if (!authId) {
		return {
			id: payloadId || undefined,
		};
	}

	if (!payloadId || payloadId === authId) {
		return {
			id: authId,
		};
	}

	return {
		error: {
			status: 403,
			message: 'Authenticated user does not match requested actor.',
		},
	};
}

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

async function getMyTaskHistoryController(authUserId = '', payload = {}) {
	const actor = resolveActorId(payload.userId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				tasks: [],
				message: actor.error.message,
			},
		};
	}

	const result = await taskService.fetchMyTaskHistory({
		...payload,
		userId: actor.id,
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

async function getTaskController(taskId, payload = {}) {
	const result = await taskService.fetchTaskById(taskId, payload);
	return {
		status: result.status,
		body: toEntityBody(result, 'task'),
	};
}

async function createTaskController(payload = {}, authUserId = '') {
	const actor = resolveActorId(payload.postedByUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				task: null,
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		postedByUserId: actor.id,
	};

	const result = await taskService.createTaskEntry(mergedPayload);
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
	const actor = resolveActorId(payload.acceptedByUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		acceptedByUserId: actor.id,
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
	const actor = resolveActorId(payload.helperUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		helperUserId: actor.id,
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
	const actor = resolveActorId(payload.ownerUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		ownerUserId: actor.id,
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
	const actor = resolveActorId(payload.ownerUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		ownerUserId: actor.id,
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
	const actor = resolveActorId(payload.ownerUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		ownerUserId: actor.id,
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
	const actor = resolveActorId(payload.ownerUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		ownerUserId: actor.id,
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
	const actor = resolveActorId(payload.ownerUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}
	const mergedPayload = {
		...payload,
		ownerUserId: actor.id,
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
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				chats: null,
				message: result.message,
			},
		};
	}

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
	const actor = resolveActorId(payload.senderId, authUserId);

	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const mergedPayload = {
		...payload,
		senderId: actor.id,
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

	const message = result.data;

	// 🔥 TARGETED DELIVERY (NO BROADCAST)

	return {
		status: result.status,
		body: {
			message: message,
		},
	};
}
async function openOrCreateTaskChatController(payload = {}, authUserId = '') {
	const hasCreateChatContract =
		typeof payload.taskId === 'string' && typeof payload.participantUserId === 'string';

	const actor = hasCreateChatContract
		? resolveActorId(payload.participantUserId, authUserId)
		: resolveActorId(payload.helperUserId, authUserId);

	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				chat: null,
				message: actor.error.message,
			},
		};
	}

	const result = hasCreateChatContract
		? await chatService.openOrCreateChatEntry({
				taskId: payload.taskId,
				participantUserId: actor.id,
		  })
		: await chatService.openOrCreateTaskChatEntry({
				...payload,
				helperUserId: actor.id,
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

async function parseVoiceTaskController(payload = {}, authUserId = '') {
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

	// ✅ BEFORE return - prefer authenticated user, fall back to payload.userId
	const actor = resolveActorId(payload.userId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				draft: null,
				message: actor.error.message,
			},
		};
	}

	// Event publication handled by voice service; controller simply returns the draft

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