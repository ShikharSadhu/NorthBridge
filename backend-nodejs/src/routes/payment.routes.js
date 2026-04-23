const {
	createPaymentRequestController,
	listPaymentRequestsController,
	updatePaymentRequestStatusController,
} = require('../controllers/payment.controller');

const paymentRoutes = [
	{
		method: 'POST',
		path: '/v1/chats/:chatId/payment-requests',
		execute: (params, body, userId) =>
			createPaymentRequestController(
				{
					chatId: params.chatId,
					taskId: typeof body.taskId === 'string' ? body.taskId : undefined,
					requesterUserId:
						typeof body.requesterUserId === 'string' ? body.requesterUserId : undefined,
					receiverUserId:
						typeof body.receiverUserId === 'string' ? body.receiverUserId : undefined,
					amount:
						typeof body.amount === 'number' || typeof body.amount === 'string'
							? body.amount
							: undefined,
					note: typeof body.note === 'string' ? body.note : undefined,
				},
				userId,
			),
	},
	{
		method: 'GET',
		path: '/v1/payment-requests',
		execute: (_params, body, userId) =>
			listPaymentRequestsController(
				{
					userId: typeof body.userId === 'string' ? body.userId : undefined,
					chatId: typeof body.chatId === 'string' ? body.chatId : undefined,
					status: typeof body.status === 'string' ? body.status : undefined,
				},
				userId,
			),
	},
	{
		method: 'PATCH',
		path: '/v1/payment-requests/:requestId',
		execute: (params, body, userId) =>
			updatePaymentRequestStatusController(
				params.requestId,
				{
					actorUserId: typeof body.actorUserId === 'string' ? body.actorUserId : undefined,
					status: typeof body.status === 'string' ? body.status : undefined,
				},
				userId,
			),
	},
];

module.exports = {
	paymentRoutes,
};
