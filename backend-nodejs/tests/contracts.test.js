/**
 * Data contract snapshot tests
 * Verifies that response payloads match expected data shapes
 */

const {handleApiRequest} = require('../src/routes');

describe('Data contract snapshots', () => {
	describe('User contract', () => {
		test('User object should have required fields', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/users',
				body: {},
			});

			expect(result.status).toBe(200);
			expect(result.body).toHaveProperty('users');
			expect(Array.isArray(result.body.users)).toBe(true);

			if (result.body.users.length > 0) {
				const user = result.body.users[0];
				expect(user).toHaveProperty('id');
				expect(user).toHaveProperty('name');
				expect(user).toHaveProperty('rating');
				expect(user).toHaveProperty('location');
				expect(typeof user.id).toBe('string');
				expect(typeof user.name).toBe('string');
				expect(typeof user.rating).toBe('number');
				expect(typeof user.location).toBe('string');
			}
		});

		test('Public user should not include password or email', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/users',
				body: {},
			});

			if (result.body.users && result.body.users.length > 0) {
				const user = result.body.users[0];
				expect(user).not.toHaveProperty('password');
				expect(user).not.toHaveProperty('email');
			}
		});
	});

	describe('Task contract', () => {
		test('Task object should have required fields including executionMode and acceptedAt', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/tasks',
				body: {},
			});

			expect(result.status).toBe(200);
			expect(result.body).toHaveProperty('tasks');
			expect(Array.isArray(result.body.tasks)).toBe(true);

			if (result.body.tasks.length > 0) {
				const task = result.body.tasks[0];
				expect(task).toHaveProperty('id');
				expect(task).toHaveProperty('postedByUserId');
				expect(task).toHaveProperty('postedByName');
				expect(task).toHaveProperty('title');
				expect(task).toHaveProperty('description');
				expect(task).toHaveProperty('location');
				expect(task).toHaveProperty('price');
				expect(task).toHaveProperty('distanceKm');
				expect(task).toHaveProperty('scheduledAt');
				expect(task).toHaveProperty('executionMode');
				// acceptedAt is optional (can be undefined for open tasks)
				expect(['online', 'offline']).toContain(task.executionMode);
				expect(typeof task.scheduledAt).toBe('string');
				expect(typeof task.price).toBe('number');
				expect(typeof task.distanceKm).toBe('number');
			}
		});

		test('ISO-8601 date format should be used for timestamps', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/tasks',
				body: {},
			});

			if (result.body.tasks && result.body.tasks.length > 0) {
				const task = result.body.tasks[0];
				const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
				expect(isoRegex.test(task.scheduledAt)).toBe(true);
				if (task.acceptedAt) {
					expect(isoRegex.test(task.acceptedAt)).toBe(true);
				}
			}
		});
	});

	describe('Chat contract', () => {
		test('Chat list requires authenticated user context', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/chats',
				body: {},
				headers: {authorization: 'Bearer mock-token-u_1001'},
			});

			expect(result.status).toBe(401);
			expect(result.body).toHaveProperty('chats', null);
		});
	});

	describe('Message contract', () => {
		test('Message endpoint requires authenticated user context', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/chats/c_9001/messages',
				body: {},
				headers: {authorization: 'Bearer mock-token-u_1001'},
			});

			expect([401, 404]).toContain(result.status);
		});

		test('Message timestamp should be ISO-8601', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/chats/c_9001/messages',
				body: {},
				headers: {authorization: 'Bearer mock-token-u_1001'},
			});

			if (result.status === 200 && result.body.messages && result.body.messages.length > 0) {
				const message = result.body.messages[0];
				const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
				expect(isoRegex.test(message.timestamp)).toBe(true);
			}
		});
	});

	describe('Voice draft contract', () => {
		test('Voice draft should have required fields including executionMode', async () => {
			const result = await handleApiRequest({
				method: 'POST',
				path: '/v1/voice/parse-task',
				body: {transcript: 'Need help picking up groceries online tomorrow'},
			});

			expect(result.status).toBe(200);
			expect(result.body).toHaveProperty('draft');
			const draft = result.body.draft;
			expect(draft).toHaveProperty('title');
			expect(draft).toHaveProperty('description');
			expect(draft).toHaveProperty('location');
			expect(draft).toHaveProperty('price');
			expect(draft).toHaveProperty('scheduledAt');
			expect(draft).toHaveProperty('executionMode');
			expect(['online', 'offline']).toContain(draft.executionMode);
			expect(typeof draft.price).toBe('number');
			expect(typeof draft.scheduledAt).toBe('string');
		});
	});

	describe('Error response format', () => {
		test('Error responses should have message field', async () => {
			const result = await handleApiRequest({
				method: 'GET',
				path: '/v1/tasks/nonexistent123',
				body: {},
			});

			expect(result.status).toBe(404);
			expect(result.body).toHaveProperty('message');
			expect(typeof result.body.message).toBe('string');
		});

		test('Should not have inconsistent message field names (no messageText)', async () => {
			const result = await handleApiRequest({
				method: 'POST',
				path: '/v1/chats/invalid/messages',
				body: {taskId: '', senderId: 'u_1', text: 'test'},
			});

			expect(result.body).not.toHaveProperty('messageText');
		});
	});
});
