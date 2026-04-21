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

	test('task lifecycle golden path supports confirm completion and rating', async () => {
		const createResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Integration Task Full Flow',
				description: 'Create -> accept -> request -> confirm -> rating',
				location: 'Noida',
				price: 75,
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
			body: {acceptedByUserId: 'u_1002'},
		});
		expect(acceptResult.status).toBe(200);

		const requestCompletionResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/completion/request`,
			body: {helperUserId: 'u_1002'},
		});
		expect(requestCompletionResult.status).toBe(200);

		const confirmResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/completion/confirm`,
			body: {ownerUserId: 'u_1001'},
		});
		expect(confirmResult.status).toBe(200);
		expect(confirmResult.body.task.status).toBe('completed');
		expect(confirmResult.body.task.isRatingPending).toBe(true);

		const ratingResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/rating`,
			body: {ownerUserId: 'u_1001', rating: 4.5},
		});
		expect(ratingResult.status).toBe(200);
		expect(ratingResult.body.task.isRatingPending).toBe(false);
		expect(ratingResult.body.task.completionRating).toBe(4.5);
	});

	test('task list returns 400 for invalid sortBy value', async () => {
		const result = await handleApiRequest({
			method: 'GET',
			path: '/v1/tasks?sortBy=invalidSortKey',
			body: {},
		});

		expect(result.status).toBe(400);
		expect(result.body).toHaveProperty('message', 'Invalid task query parameters.');
	});

	test('task completion request is rejected when already requested', async () => {
		const createResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Duplicate completion request task',
				description: 'Should reject second completion request.',
				location: 'Gurgaon',
				price: 33,
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
			body: {acceptedByUserId: 'u_1002'},
		});
		expect(acceptResult.status).toBe(200);

		const firstRequest = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/completion/request`,
			body: {helperUserId: 'u_1002'},
		});
		expect(firstRequest.status).toBe(200);

		const secondRequest = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/completion/request`,
			body: {helperUserId: 'u_1002'},
		});
		expect(secondRequest.status).toBe(409);
		expect(secondRequest.body).toHaveProperty(
			'message',
			'Completion is already requested for this task.',
		);
	});

	test('closed task cannot be accepted', async () => {
		const createResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Closed accept guard task',
				description: 'Should reject accept when closed.',
				location: 'Delhi',
				price: 25,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
			},
		});

		expect(createResult.status).toBe(201);
		const taskId = createResult.body.task.id;

		const cancelResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/cancel`,
			body: {ownerUserId: 'u_1001'},
		});
		expect(cancelResult.status).toBe(200);

		const acceptResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/tasks/${taskId}/accept`,
			body: {acceptedByUserId: 'u_1002'},
		});
		expect(acceptResult.status).toBe(409);
		expect(acceptResult.body).toHaveProperty(
			'message',
			'Task is closed and cannot be accepted.',
		);
	});

	test('task location supports map coordinates and returns distance for acceptor coordinates', async () => {
		const createResult = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Map Location Task',
				description: 'Task with picked map coordinates.',
				location: 'Connaught Place, Delhi',
				price: 80,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
				locationGeo: {
					lat: 28.6328,
					lng: 77.2197,
				},
			},
		});

		expect(createResult.status).toBe(201);
		expect(createResult.body.task).toHaveProperty('locationGeo');
		expect(createResult.body.task.locationGeo).toHaveProperty('lat', 28.6328);
		expect(createResult.body.task.locationGeo).toHaveProperty('lng', 77.2197);

		const taskId = createResult.body.task.id;
		const detailResult = await handleApiRequest({
			method: 'GET',
			path: `/v1/tasks/${taskId}?acceptorLat=28.6139&acceptorLng=77.2090`,
			body: {},
		});

		expect(detailResult.status).toBe(200);
		expect(detailResult.body.task.distanceKm).toBeGreaterThan(0);

		const listResult = await handleApiRequest({
			method: 'GET',
			path: '/v1/tasks?acceptorLat=28.6139&acceptorLng=77.2090&sortBy=distance',
			body: {},
		});

		expect(listResult.status).toBe(200);
		const listed = listResult.body.tasks.find((task) => task.id === taskId);
		expect(listed).toBeDefined();
		expect(listed.distanceKm).toBeGreaterThan(0);
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

	test('voice endpoint validates text payload', async () => {
		const result = await handleApiRequest({
			method: 'POST',
			path: '/v1/voice',
			body: {},
		});

		expect(result.status).toBe(400);
		expect(result.body).toHaveProperty('message', 'text is required.');
	});

	test('voice endpoint requires authenticated user', async () => {
		const result = await handleApiRequest({
			method: 'POST',
			path: '/v1/voice',
			body: {
				text: 'Need groceries delivered by evening',
			},
		});

		expect(result.status).toBe(401);
		expect(result.body).toHaveProperty('message', 'User is not authenticated.');
	});

	test('chat list returns 400 for invalid page query', async () => {
		const result = await handleApiRequest({
			method: 'GET',
			path: '/v1/chats?page=0&pageSize=abc',
			body: {userId: 'u_1001'},
		});

		expect(result.status).toBe(400);
		expect(result.body).toHaveProperty('message', 'Invalid chat query parameters.');
	});

	test('message send rejects non-participant sender', async () => {
		const taskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Chat membership guard task',
				description: 'Only participants can send messages.',
				location: 'Noida',
				price: 20,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
			},
		});

		expect(taskCreate.status).toBe(201);

		const chatCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			body: {
				taskId: taskCreate.body.task.id,
				participantUserId: 'u_1002',
			},
		});
		expect([200, 201]).toContain(chatCreate.status);

		const messageResult = await handleApiRequest({
			method: 'POST',
			path: `/v1/chats/${chatCreate.body.chat.chatId}/messages`,
			body: {
				taskId: taskCreate.body.task.id,
				senderId: 'u_1003',
				text: 'I am not part of this chat.',
			},
		});

		expect(messageResult.status).toBe(403);
		expect(messageResult.body).toHaveProperty(
			'message',
			'Only chat participants can send messages.',
		);
	});

	test('message send rejects taskId mismatch against chat task', async () => {
		const firstTaskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Chat task id mismatch source',
				description: 'Task A',
				location: 'Delhi',
				price: 21,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
			},
		});
		const secondTaskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Chat task id mismatch target',
				description: 'Task B',
				location: 'Delhi',
				price: 22,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_1001',
				postedByName: 'Aarav Sharma',
			},
		});

		expect(firstTaskCreate.status).toBe(201);
		expect(secondTaskCreate.status).toBe(201);

		const chatCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			body: {
				taskId: firstTaskCreate.body.task.id,
				participantUserId: 'u_1002',
			},
		});
		expect([200, 201]).toContain(chatCreate.status);

		const mismatchMessage = await handleApiRequest({
			method: 'POST',
			path: `/v1/chats/${chatCreate.body.chat.chatId}/messages`,
			body: {
				taskId: secondTaskCreate.body.task.id,
				senderId: 'u_1002',
				text: 'Wrong task id',
			},
		});

		expect(mismatchMessage.status).toBe(400);
		expect(mismatchMessage.body).toHaveProperty('message', 'taskId does not match chat task.');
	});
});
