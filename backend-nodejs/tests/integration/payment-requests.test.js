describe('payment request workflow', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	test('create, accept, and settle payment request across chat participants', async () => {
		jest.doMock('../../src/middlewares/auth.middleware', () => ({
			normalizeHeaders: (headers) => headers || {},
			getAuthContext: async (headers = {}) => {
				const userId =
					typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : undefined;
				return {
					userId,
					email: undefined,
					name: userId ? `User ${userId}` : undefined,
					tokenProvided: Boolean(userId),
					authErrorCode: undefined,
					authErrorMessage: undefined,
					isAuthenticated: Boolean(userId),
				};
			},
		}));

		const {handleApiRequest} = require('../../src/routes');

		const taskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Payment workflow task',
				description: 'Validate payment request lifecycle.',
				location: 'Delhi',
				price: 150,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_pay_owner',
				postedByName: 'Owner User',
			},
			headers: {'x-user-id': 'u_pay_owner'},
		});
		expect(taskCreate.status).toBe(201);

		const chatCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			body: {
				taskId: taskCreate.body.task.id,
				participantUserId: 'u_pay_helper',
			},
			headers: {'x-user-id': 'u_pay_helper'},
		});
		expect([200, 201]).toContain(chatCreate.status);

		const createPaymentRequest = await handleApiRequest({
			method: 'POST',
			path: `/v1/chats/${chatCreate.body.chat.chatId}/payment-requests`,
			body: {
				taskId: taskCreate.body.task.id,
				receiverUserId: 'u_pay_owner',
				amount: 150,
				note: 'Please confirm payment',
			},
			headers: {'x-user-id': 'u_pay_helper'},
		});
		expect(createPaymentRequest.status).toBe(201);
		expect(createPaymentRequest.body.paymentRequest).toHaveProperty('status', 'pending');

		const acceptPaymentRequest = await handleApiRequest({
			method: 'PATCH',
			path: `/v1/payment-requests/${createPaymentRequest.body.paymentRequest.id}`,
			body: {
				status: 'accepted',
			},
			headers: {'x-user-id': 'u_pay_owner'},
		});
		expect(acceptPaymentRequest.status).toBe(200);
		expect(acceptPaymentRequest.body.paymentRequest).toHaveProperty('status', 'accepted');

		const settlePaymentRequest = await handleApiRequest({
			method: 'PATCH',
			path: `/v1/payment-requests/${createPaymentRequest.body.paymentRequest.id}`,
			body: {
				status: 'paid',
			},
			headers: {'x-user-id': 'u_pay_helper'},
		});
		expect(settlePaymentRequest.status).toBe(200);
		expect(settlePaymentRequest.body.paymentRequest).toHaveProperty('status', 'paid');

		const listPaidRequests = await handleApiRequest({
			method: 'GET',
			path: '/v1/payment-requests?status=paid',
			body: {},
			headers: {'x-user-id': 'u_pay_helper'},
		});
		expect(listPaidRequests.status).toBe(200);
		expect(Array.isArray(listPaidRequests.body.paymentRequests)).toBe(true);
		expect(
			listPaidRequests.body.paymentRequests.some(
				(entry) => entry.id === createPaymentRequest.body.paymentRequest.id,
			),
		).toBe(true);
	});

	test('requester cannot accept their own payment request', async () => {
		jest.doMock('../../src/middlewares/auth.middleware', () => ({
			normalizeHeaders: (headers) => headers || {},
			getAuthContext: async (headers = {}) => {
				const userId =
					typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : undefined;
				return {
					userId,
					email: undefined,
					name: userId ? `User ${userId}` : undefined,
					tokenProvided: Boolean(userId),
					authErrorCode: undefined,
					authErrorMessage: undefined,
					isAuthenticated: Boolean(userId),
				};
			},
		}));

		const {handleApiRequest} = require('../../src/routes');

		const taskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Payment guard task',
				description: 'Guard requester cannot accept own request.',
				location: 'Noida',
				price: 70,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_pay_owner_2',
				postedByName: 'Owner User 2',
			},
			headers: {'x-user-id': 'u_pay_owner_2'},
		});
		expect(taskCreate.status).toBe(201);

		const chatCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			body: {
				taskId: taskCreate.body.task.id,
				participantUserId: 'u_pay_helper_2',
			},
			headers: {'x-user-id': 'u_pay_helper_2'},
		});
		expect([200, 201]).toContain(chatCreate.status);

		const createPaymentRequest = await handleApiRequest({
			method: 'POST',
			path: `/v1/chats/${chatCreate.body.chat.chatId}/payment-requests`,
			body: {
				taskId: taskCreate.body.task.id,
				receiverUserId: 'u_pay_owner_2',
				amount: 70,
			},
			headers: {'x-user-id': 'u_pay_helper_2'},
		});
		expect(createPaymentRequest.status).toBe(201);

		const invalidAccept = await handleApiRequest({
			method: 'PATCH',
			path: `/v1/payment-requests/${createPaymentRequest.body.paymentRequest.id}`,
			body: {
				status: 'accepted',
			},
			headers: {'x-user-id': 'u_pay_helper_2'},
		});
		expect(invalidAccept.status).toBe(403);
		expect(invalidAccept.body).toHaveProperty(
			'message',
			'Only request receiver can accept or decline.',
		);
	});
});
