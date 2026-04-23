describe('frontend compatibility contracts', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	test('chat list returns non-null lastMessage fields parseable by frontend models', async () => {
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
				title: 'Compat chat task',
				description: 'Ensure frontend parsing safety.',
				location: 'Delhi',
				price: 95,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_front_owner',
				postedByName: 'Owner',
			},
			headers: {'x-user-id': 'u_front_owner'},
		});
		expect(taskCreate.status).toBe(201);

		const chatCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/chats',
			body: {
				taskId: taskCreate.body.task.id,
				participantUserId: 'u_front_helper',
			},
			headers: {'x-user-id': 'u_front_helper'},
		});
		expect([200, 201]).toContain(chatCreate.status);

		const chats = await handleApiRequest({
			method: 'GET',
			path: '/v1/chats',
			body: {},
			headers: {'x-user-id': 'u_front_helper'},
		});
		expect(chats.status).toBe(200);
		expect(Array.isArray(chats.body.chats)).toBe(true);
		expect(chats.body.chats.length).toBeGreaterThan(0);

		const firstChat = chats.body.chats[0];
		expect(firstChat).toHaveProperty('chatId');
		expect(firstChat).toHaveProperty('taskId');
		expect(firstChat).toHaveProperty('taskTitle');
		expect(firstChat).toHaveProperty('taskOwnerUserId');
		expect(firstChat).toHaveProperty('taskOwnerName');
		expect(firstChat).toHaveProperty('users');
		expect(firstChat).toHaveProperty('lastMessage');
		expect(firstChat.lastMessage).not.toBeNull();
		expect(firstChat.lastMessage).toHaveProperty('id');
		expect(firstChat.lastMessage).toHaveProperty('chatId');
		expect(firstChat.lastMessage).toHaveProperty('taskId');
		expect(firstChat.lastMessage).toHaveProperty('senderId');
		expect(firstChat.lastMessage).toHaveProperty('text');
		expect(firstChat.lastMessage).toHaveProperty('timestamp');
	});

	test('auth and task responses include frontend-required model fields', async () => {
		jest.doMock('../../src/middlewares/auth.middleware', () => ({
			normalizeHeaders: (headers) => headers || {},
			getAuthContext: async (headers = {}) => {
				const userId =
					typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : undefined;
				return {
					userId,
					email: userId ? `${userId}@northbridge.app` : undefined,
					name: userId ? `User ${userId}` : undefined,
					tokenProvided: Boolean(userId),
					authErrorCode: undefined,
					authErrorMessage: undefined,
					isAuthenticated: Boolean(userId),
				};
			},
		}));

		const {handleApiRequest} = require('../../src/routes');

		const login = await handleApiRequest({
			method: 'POST',
			path: '/v1/auth/login',
			body: {
				name: 'Frontend User',
				location: 'Noida',
				email: 'frontend-user@northbridge.app',
			},
			headers: {'x-user-id': 'u_front_profile'},
		});
		expect(login.status).toBe(200);

		const currentUser = await handleApiRequest({
			method: 'GET',
			path: '/v1/auth/me',
			body: {},
			headers: {'x-user-id': 'u_front_profile'},
		});
		expect(currentUser.status).toBe(200);
		expect(currentUser.body.user).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: expect.any(String),
				bio: expect.any(String),
				rating: expect.any(Number),
				tasksDone: expect.any(Number),
				location: expect.any(String),
				phoneNumber: expect.any(String),
				email: expect.any(String),
				skills: expect.any(Array),
				profileImageUrl: expect.any(String),
				privatePaymentQrDataUrl: expect.any(String),
			}),
		);

		const taskCreate = await handleApiRequest({
			method: 'POST',
			path: '/v1/tasks',
			body: {
				title: 'Frontend task shape',
				description: 'Ensure required task model fields are present.',
				location: 'Noida',
				price: 120,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_front_profile',
				postedByName: 'Frontend User',
			},
			headers: {'x-user-id': 'u_front_profile'},
		});
		expect(taskCreate.status).toBe(201);
		expect(taskCreate.body.task).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				postedByUserId: expect.any(String),
				postedByName: expect.any(String),
				title: expect.any(String),
				description: expect.any(String),
				location: expect.any(String),
				price: expect.any(Number),
				distanceKm: expect.any(Number),
				scheduledAt: expect.any(String),
				executionMode: expect.any(String),
				isActive: expect.any(Boolean),
				isRatingPending: expect.any(Boolean),
			}),
		);
	});
});
