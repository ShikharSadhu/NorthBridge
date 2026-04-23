describe('voice endpoint success with mocked auth strategy', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	test('POST /v1/voice returns full task object for authenticated user', async () => {
		jest.doMock('../../src/middlewares/auth.middleware', () => ({
			normalizeHeaders: (headers) => headers || {},
			getAuthContext: async () => ({
				userId: 'u_test_1001',
				email: 'test@northbridge.app',
				name: 'Test User',
				isAuthenticated: true,
			}),
		}));

		jest.doMock('../../src/services/voice.service', () => ({
			parseVoiceTask: () => ({ok: true, status: 200, data: {}}),
			extractTaskFields: async () => ({
				title: 'Pick up groceries',
				description: 'Need groceries from nearby market',
				location: 'Unknown',
				price: 0,
				scheduledAt: null,
				executionMode: 'offline',
			}),
			buildFullTask: (userFields, currentUser) => ({
				id: 't_mock_001',
				...userFields,
				postedByUserId: currentUser.uid,
				postedByName: currentUser.name,
				status: 'open',
				isActive: true,
				isRatingPending: false,
				acceptedAt: null,
				acceptedByUserId: null,
				completedAt: null,
				completedByUserId: null,
				completionRequestedAt: null,
				completionRequestedByUserId: null,
				distanceKm: 0,
			}),
		}));

		const {handleApiRequest} = require('../../src/routes');
		const result = await handleApiRequest({
			method: 'POST',
			path: '/v1/voice',
			body: {
				text: 'Need groceries delivered today',
			},
		});

		expect(result.status).toBe(200);
		expect(result.body).toHaveProperty('id', 't_mock_001');
		expect(result.body).toHaveProperty('postedByUserId', 'u_test_1001');
		expect(result.body).toHaveProperty('postedByName', 'Test User');
		expect(result.body).toHaveProperty('executionMode', 'offline');
		expect(result.body).toHaveProperty('status', 'open');
		expect(result.body).toHaveProperty('isActive', true);
		expect(result.body).toHaveProperty('distanceKm', 0);
	});
});
