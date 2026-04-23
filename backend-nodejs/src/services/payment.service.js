const {getChatById} = require('../repositories/chat.repository');
const {
	createPaymentRequest,
	getPaymentRequestById,
	listPaymentRequestsByUserId,
	updatePaymentRequest,
} = require('../repositories/payment-request.repository');
const {
	validateCreatePaymentRequestPayload,
	validateListPaymentRequestsPayload,
	validateUpdatePaymentRequestPayload,
} = require('../validators/payment.validator');
const {success, failure} = require('../utils/response.util');

function canTransitionPaymentStatus(existing, desired, actorUserId) {
	if (!existing || !desired) {
		return {ok: false, message: 'Invalid status transition.'};
	}

	if (existing.status === desired) {
		return {ok: true};
	}

	if (existing.status === 'pending') {
		if (desired === 'accepted' || desired === 'declined') {
			if (actorUserId !== existing.receiverUserId) {
				return {ok: false, message: 'Only request receiver can accept or decline.'};
			}
			return {ok: true};
		}

		if (desired === 'cancelled') {
			if (actorUserId !== existing.requesterUserId) {
				return {ok: false, message: 'Only requester can cancel a pending request.'};
			}
			return {ok: true};
		}
	}

	if (existing.status === 'accepted') {
		if (desired === 'paid') {
			if (actorUserId !== existing.requesterUserId) {
				return {ok: false, message: 'Only requester can mark accepted request as paid.'};
			}
			return {ok: true};
		}

		if (desired === 'cancelled') {
			if (actorUserId !== existing.requesterUserId) {
				return {ok: false, message: 'Only requester can cancel an accepted request.'};
			}
			return {ok: true};
		}
	}

	return {ok: false, message: 'Invalid payment status transition.'};
}

async function createPaymentRequestEntry(payload = {}) {
	const validation = validateCreatePaymentRequestPayload(payload);
	if (!validation.valid) {
		return failure(400, 'chatId, taskId, requesterUserId, receiverUserId, and positive amount are required.');
	}

	const chat = await getChatById(validation.value.chatId);
	if (!chat) {
		return failure(404, 'Chat not found.');
	}
	if (chat.taskId !== validation.value.taskId) {
		return failure(400, 'taskId does not match chat task.');
	}
	if (!chat.users.includes(validation.value.requesterUserId)) {
		return failure(403, 'Requester must be a participant in the chat.');
	}
	if (!chat.users.includes(validation.value.receiverUserId)) {
		return failure(403, 'Receiver must be a participant in the chat.');
	}

	const created = await createPaymentRequest(validation.value);
	return success(201, created);
}

async function listPaymentRequestsEntry(payload = {}) {
	const validation = validateListPaymentRequestsPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Invalid payment request query parameters.');
	}

	const requests = await listPaymentRequestsByUserId(validation.value.userId);
	const filtered = requests.filter((request) => {
		if (validation.value.chatId && request.chatId !== validation.value.chatId) {
			return false;
		}
		if (validation.value.status && request.status !== validation.value.status) {
			return false;
		}
		return true;
	});

	return success(200, filtered);
}

async function updatePaymentRequestStatusEntry(requestId, payload = {}) {
	const validation = validateUpdatePaymentRequestPayload(payload);
	if (!validation.valid) {
		return failure(400, 'actorUserId and valid status are required.');
	}

	const existing = await getPaymentRequestById(requestId);
	if (!existing) {
		return failure(404, 'Payment request not found.');
	}

	const transition = canTransitionPaymentStatus(
		existing,
		validation.value.status,
		validation.value.actorUserId,
	);
	if (!transition.ok) {
		return failure(403, transition.message);
	}

	const updates = {
		status: validation.value.status,
		resolvedAt:
			validation.value.status === 'accepted' || validation.value.status === 'pending'
				? undefined
				: new Date().toISOString(),
	};
	const updated = await updatePaymentRequest(requestId, updates);
	return success(200, updated);
}

module.exports = {
	createPaymentRequestEntry,
	listPaymentRequestsEntry,
	updatePaymentRequestStatusEntry,
};
