/**
 * Route and method compatibility tests
 * Verifies that all routes are properly defined and respond with correct HTTP methods
 */

const {routes, handleApiRequest} = require('../src/routes');

describe('Route methods and paths', () => {
	describe('Supported HTTP methods', () => {
		test('GET method should be supported', async () => {
			const result = await handleApiRequest({method: 'GET', path: '/v1/health', body: {}});
			expect(result.status).not.toBe(405);
		});

		test('POST method should be supported', async () => {
			const result = await handleApiRequest({method: 'POST', path: '/v1/auth/login', body: {email: 'test@test.com', password: 'pass'}});
			expect([200, 400, 401, 409]).toContain(result.status);
		});

		test('PATCH method should be supported', async () => {
			const result = await handleApiRequest({
				method: 'PATCH',
				path: '/v1/auth/me/profile',
				body: {name: 'Test'},
				headers: {'x-user-id': 'u_1001'},
			});
			expect([200, 400, 401]).toContain(result.status);
		});

		test('PUT method should return 405', async () => {
			const result = await handleApiRequest({method: 'PUT', path: '/v1/tasks', body: {}});
			expect(result.status).toBe(405);
		});

		test('DELETE method should return 405', async () => {
			const result = await handleApiRequest({method: 'DELETE', path: '/v1/tasks/1', body: {}});
			expect(result.status).toBe(405);
		});
	});

	describe('Auth routes', () => {
		test('GET /v1/auth/me should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/auth/me');
			expect(route).toBeDefined();
		});

		test('POST /v1/auth/login should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/auth/login');
			expect(route).toBeDefined();
		});

		test('POST /v1/auth/signup should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/auth/signup');
			expect(route).toBeDefined();
		});

		test('POST /v1/auth/logout should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/auth/logout');
			expect(route).toBeDefined();
		});

		test('PATCH /v1/auth/me/profile should exist', () => {
			const route = routes.find((r) => r.method === 'PATCH' && r.path === '/v1/auth/me/profile');
			expect(route).toBeDefined();
		});
	});

	describe('User routes', () => {
		test('GET /v1/users should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/users');
			expect(route).toBeDefined();
		});

		test('GET /v1/users/:userId should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/users/:userId');
			expect(route).toBeDefined();
		});
	});

	describe('Task routes', () => {
		test('GET /v1/tasks should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/tasks');
			expect(route).toBeDefined();
		});

		test('GET /v1/tasks/:taskId should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/tasks/:taskId');
			expect(route).toBeDefined();
		});

		test('POST /v1/tasks should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/tasks');
			expect(route).toBeDefined();
		});

		test('POST /v1/tasks/:taskId/accept should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/tasks/:taskId/accept');
			expect(route).toBeDefined();
		});
	});

	describe('Chat routes', () => {
		test('GET /v1/chats should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/chats');
			expect(route).toBeDefined();
		});

		test('GET /v1/chats/:chatId/messages should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/chats/:chatId/messages');
			expect(route).toBeDefined();
		});

		test('POST /v1/chats/:chatId/messages should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/chats/:chatId/messages');
			expect(route).toBeDefined();
		});
	});

	describe('Voice routes', () => {
		test('POST /v1/voice/parse-task should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/voice/parse-task');
			expect(route).toBeDefined();
		});
	});

	describe('Report routes', () => {
		test('POST /v1/reports/users/:userId should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/reports/users/:userId');
			expect(route).toBeDefined();
		});

		test('POST /v1/reports/messages/:messageId should exist', () => {
			const route = routes.find((r) => r.method === 'POST' && r.path === '/v1/reports/messages/:messageId');
			expect(route).toBeDefined();
		});

		test('GET /v1/reports should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/reports');
			expect(route).toBeDefined();
		});

		test('PATCH /v1/reports/:reportId should exist', () => {
			const route = routes.find((r) => r.method === 'PATCH' && r.path === '/v1/reports/:reportId');
			expect(route).toBeDefined();
		});
	});

	describe('Health routes', () => {
		test('GET /v1/health should exist', () => {
			const route = routes.find((r) => r.method === 'GET' && r.path === '/v1/health');
			expect(route).toBeDefined();
		});
	});

	describe('Route responses are well-formed', () => {
		test('All route handlers return {status, body}', async () => {
			for (const route of routes) {
				const params = {'taskId': '1', 'chatId': '1', 'userId': 'u_1'};
				const body = {
					title: 'Test',
					description: 'Test task',
					location: 'Test location',
					price: 100,
					scheduledAt: new Date().toISOString(),
					email: 'test@test.com',
					password: 'pass123',
					name: 'Test User',
					transcript: 'Test',
				};
				const result = await route.execute(params, body, 'u_1001');
				expect(result).toHaveProperty('status');
				expect(result).toHaveProperty('body');
				expect(typeof result.status).toBe('number');
				expect(typeof result.body).toBe('object');
			}
		});
	});
});
