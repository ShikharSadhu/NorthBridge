const {
	createPaymentRequestEntry,
	listPaymentRequestsEntry,
	updatePaymentRequestStatusEntry,
} = require('../services/payment.service');

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

async function createPaymentRequestController(payload = {}, authUserId = '') {
	const actor = resolveActorId(payload.requesterUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
			},
		};
	}

	const result = await createPaymentRequestEntry({
		...payload,
		requesterUserId: actor.id,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				message: result.message,
				paymentRequest: null,
			},
		};
	}

	return {
		status: result.status,
		body: {
			paymentRequest: result.data,
		},
	};
}

async function listPaymentRequestsController(payload = {}, authUserId = '') {
	const actor = resolveActorId(payload.userId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
				paymentRequests: [],
			},
		};
	}

	const result = await listPaymentRequestsEntry({
		...payload,
		userId: actor.id,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				message: result.message,
				paymentRequests: [],
			},
		};
	}

	return {
		status: result.status,
		body: {
			paymentRequests: result.data,
		},
	};
}

async function updatePaymentRequestStatusController(requestId, payload = {}, authUserId = '') {
	const actor = resolveActorId(payload.actorUserId, authUserId);
	if (actor.error) {
		return {
			status: actor.error.status,
			body: {
				message: actor.error.message,
				paymentRequest: null,
			},
		};
	}

	const result = await updatePaymentRequestStatusEntry(requestId, {
		...payload,
		actorUserId: actor.id,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				message: result.message,
				paymentRequest: null,
			},
		};
	}

	return {
		status: result.status,
		body: {
			paymentRequest: result.data,
		},
	};
}

module.exports = {
	createPaymentRequestController,
	listPaymentRequestsController,
	updatePaymentRequestStatusController,
};
