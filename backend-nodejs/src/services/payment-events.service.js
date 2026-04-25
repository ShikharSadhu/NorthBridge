const websocketService = require('./websocket.service');
const notificationService = require('./notification.service');

function safeFire(promise) {
	try {
		if (promise && typeof promise.then === 'function') {
			promise.catch(() => {});
		}
	} catch (_error) {}
}

function participants(paymentRequest = {}) {
	return Array.from(
		new Set(
			[paymentRequest.requesterUserId, paymentRequest.receiverUserId].filter(
				(id) => typeof id === 'string' && id.trim(),
			),
		),
	);
}

function publishToParticipants(type, paymentRequest) {
	const userIds = participants(paymentRequest);
	for (const userId of userIds) {
		websocketService.sendToUser(userId, {
			type,
			data: paymentRequest,
		});
	}
	safeFire(notificationService.notifyUsers(userIds, {type, data: paymentRequest}));
}

async function notifyPaymentRequested(paymentRequest) {
	publishToParticipants('PAYMENT_REQUESTED', paymentRequest);
}

async function notifyPaymentUpdated(paymentRequest) {
	const status = typeof paymentRequest?.status === 'string' ? paymentRequest.status.toUpperCase() : 'UPDATED';
	publishToParticipants(`PAYMENT_${status}`, paymentRequest);
	publishToParticipants('PAYMENT_UPDATED', paymentRequest);
}

module.exports = {
	notifyPaymentRequested,
	notifyPaymentUpdated,
};
