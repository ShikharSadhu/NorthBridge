function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function createValidationResult(valid, value, errors) {
	return {
		valid,
		value,
		errors,
	};
}

function validateChatId(chatId) {
	const value = normalizeString(chatId);
	const errors = [];
	if (!value) {
		errors.push({field: 'chatId', message: 'chatId is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateSendMessagePayload(payload = {}) {
	const normalizedText = normalizeString(payload.text);
	const normalizedImageDataUrl = normalizeString(payload.imageDataUrl);
	const value = {
		chatId: normalizeString(payload.chatId),
		taskId: normalizeString(payload.taskId),
		senderId: normalizeString(payload.senderId),
		text: normalizedText,
		imageDataUrl: normalizedImageDataUrl || undefined,
		isPaymentRequest: Boolean(payload.isPaymentRequest),
	};

	const errors = [];
	if (!value.chatId) {
		errors.push({field: 'chatId', message: 'chatId is required.'});
	}
	if (!value.taskId) {
		errors.push({field: 'taskId', message: 'taskId is required.'});
	}
	if (!value.senderId) {
		errors.push({field: 'senderId', message: 'senderId is required.'});
	}
	if (!value.text && !value.imageDataUrl) {
		errors.push({field: 'text', message: 'text or imageDataUrl is required.'});
	}
	if (value.imageDataUrl && !value.imageDataUrl.startsWith('data:image/')) {
		errors.push({field: 'imageDataUrl', message: 'imageDataUrl must be a valid image data URL.'});
	}
	if (value.imageDataUrl && value.imageDataUrl.length > 2_000_000) {
		errors.push({field: 'imageDataUrl', message: 'imageDataUrl exceeds maximum allowed size.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateTaskChatPayload(payload = {}) {
	const task = payload.task && typeof payload.task === 'object' ? payload.task : {};
	const value = {
		helperUserId: normalizeString(payload.helperUserId),
		task: {
			id: normalizeString(task.id),
			postedByUserId: normalizeString(task.postedByUserId),
			postedByName: normalizeString(task.postedByName),
			title: normalizeString(task.title),
		},
	};

	const errors = [];
	if (!value.helperUserId) {
		errors.push({field: 'helperUserId', message: 'helperUserId is required.'});
	}
	if (!value.task.id) {
		errors.push({field: 'task.id', message: 'task.id is required.'});
	}
	if (!value.task.postedByUserId) {
		errors.push({field: 'task.postedByUserId', message: 'task.postedByUserId is required.'});
	}
	if (!value.task.postedByName) {
		errors.push({field: 'task.postedByName', message: 'task.postedByName is required.'});
	}
	if (!value.task.title) {
		errors.push({field: 'task.title', message: 'task.title is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateCreateChatPayload(payload = {}) {
	const value = {
		taskId: normalizeString(payload.taskId),
		participantUserId: normalizeString(payload.participantUserId),
	};

	const errors = [];
	if (!value.taskId) {
		errors.push({field: 'taskId', message: 'taskId is required.'});
	}
	if (!value.participantUserId) {
		errors.push({field: 'participantUserId', message: 'participantUserId is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

module.exports = {
	normalizeString,
	createValidationResult,
	validateChatId,
	validateSendMessagePayload,
	validateTaskChatPayload,
	validateCreateChatPayload,
};
