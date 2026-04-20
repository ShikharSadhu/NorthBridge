const {handleApiRequest} = require('../../src/routes');

describe('integration api flows', () => {
	test('health endpoint returns diagnostics', async () => {
		const result = await handleApiRequest({method: 'GET', path: '/v1/health'});
		expect(result.status).toBe(200);
		expect(result.body).toHaveProperty('status', 'ok');
		expect(result.body).toHaveProperty('authMode');
		expect(result.body).toHaveProperty('buildVersion');
		expect(result.body).toHaveProperty('firestore');
	});

	test('auth login requires firebase-authenticated context', async () => {
		const result = await handleApiRequest({
			method: 'POST',
			path: '/v1/auth/login',
			body: {
				email: 'aarav@northbridge.app',
			},
		});

		expect(result.status).toBe(401);
		expect(result.body).toHaveProperty('message', 'User is not authenticated.');
	});

	test('auth me does not trust payload userId without authentication', async () => {
		const result = await handleApiRequest({
			method: 'GET',
			path: '/v1/auth/me',
			body: {userId: 'u_1001'},
		});

		expect(result.status).toBe(401);
	});

	test('auth me rejects invalid bearer token values', async () => {
		const result = await handleApiRequest({
			method: 'GET',
			path: '/v1/auth/me',
			headers: {authorization: 'Bearer mock-token-u_1001'},
			body: {},
		});

		expect(result.status).toBe(401);
	});

	test('task lifecycle complete route works for accepted task flow', async () => {
		const createResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Integration Task',
				description: 'Integration lifecycle check.',
				location: 'Delhi',
				price: 42,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
			},
		});

		expect(createResult.status).toBe(201);
		const taskId = createResult.body.task.id;

		const acceptResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/accept`,
			headers: {authorization: 'Bearer mock-token-u_1002'},
			body: {acceptedByUserId: 'u_1002'},
		});
		expect(acceptResult.status).toBe(200);

		const requestCompletionResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/completion/request`,
			headers: {authorization: 'Bearer mock-token-u_1002'},
			body: {helperUserId: 'u_1002'},
		});
		expect(requestCompletionResult.status).toBe(200);

		const completeResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/complete`,
			headers: {authorization: 'Bearer mock-token-u_1001'},
			body: {ownerUserId: 'u_1001'},
		});

		expect(completeResult.status).toBe(200);
		expect(completeResult.body.task.status).toBe('completed');
		expect(completeResult.body.task.isActive).toBe(false);
	});

	test('chat creation returns 404 for unknown task id', async () => {
		const chatResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			headers: {authorization: 'Bearer mock-token-u_1004'},
			body: {
				taskId: '3',
				participantUserId: 'u_1004',
			},
		});

		expect(chatResult.status).toBe(404);
		expect(chatResult.body).toHaveProperty('message', 'Task not found.');
	});
});
