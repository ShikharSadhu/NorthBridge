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

function parseAmount(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return undefined;
}

function validateCreatePaymentRequestPayload(payload = {}) {
	const amount = parseAmount(payload.amount);
	const value = {
		chatId: normalizeString(payload.chatId),
		taskId: normalizeString(payload.taskId),
		requesterUserId: normalizeString(payload.requesterUserId),
		receiverUserId: normalizeString(payload.receiverUserId),
		amount,
		note: normalizeString(payload.note),
	};

	const errors = [];
	if (!value.chatId) {
		errors.push({field: 'chatId', message: 'chatId is required.'});
	}
	if (!value.taskId) {
		errors.push({field: 'taskId', message: 'taskId is required.'});
	}
	if (!value.requesterUserId) {
		errors.push({field: 'requesterUserId', message: 'requesterUserId is required.'});
	}
	if (!value.receiverUserId) {
		errors.push({field: 'receiverUserId', message: 'receiverUserId is required.'});
	}
	if (value.requesterUserId && value.receiverUserId && value.requesterUserId === value.receiverUserId) {
		errors.push({field: 'receiverUserId', message: 'receiverUserId must be different from requesterUserId.'});
	}
	if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
		errors.push({field: 'amount', message: 'amount must be a positive number.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateListPaymentRequestsPayload(payload = {}) {
	const status = normalizeString(payload.status).toLowerCase();
	const value = {
		userId: normalizeString(payload.userId),
		chatId: normalizeString(payload.chatId),
		status: status || undefined,
	};

	const allowedStatus = new Set(['pending', 'accepted', 'declined', 'paid', 'cancelled']);
	const errors = [];
	if (!value.userId) {
		errors.push({field: 'userId', message: 'userId is required.'});
	}
	if (value.status && !allowedStatus.has(value.status)) {
		errors.push({field: 'status', message: 'status is invalid.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateUpdatePaymentRequestPayload(payload = {}) {
	const status = normalizeString(payload.status).toLowerCase();
	const value = {
		actorUserId: normalizeString(payload.actorUserId),
		status,
	};

	const allowedStatus = new Set(['accepted', 'declined', 'paid', 'cancelled']);
	const errors = [];
	if (!value.actorUserId) {
		errors.push({field: 'actorUserId', message: 'actorUserId is required.'});
	}
	if (!value.status || !allowedStatus.has(value.status)) {
		errors.push({field: 'status', message: 'status must be accepted, declined, paid, or cancelled.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

module.exports = {
	validateCreatePaymentRequestPayload,
	validateListPaymentRequestsPayload,
	validateUpdatePaymentRequestPayload,
};
