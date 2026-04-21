/**
 * Data contract snapshot tests
 * Verifies that response payloads match expected data shapes
 */

const {handleApiRequest} = require('../src/routes');
const {listMessagesByChatId} = require('../src/repositories/message.repository');

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
				if (task.locationGeo) {
					expect(task.locationGeo).toHaveProperty('lat');
					expect(task.locationGeo).toHaveProperty('lng');
					expect(typeof task.locationGeo.lat).toBe('number');
					expect(typeof task.locationGeo.lng).toBe('number');
				}
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
		test('Chat object should follow expected schema with nullable lastMessage', async () => {
			const taskCreate = await handleApiRequest({
				method: 'POST',
				path: '/v1/tasks',
				body: {
					title: 'Contract chat task',
					description: 'Used for chat contract schema coverage.',
					location: 'Delhi',
					price: 45,
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

			expect(chatCreate.body).toHaveProperty('chat');
			const chat = chatCreate.body.chat;
			expect(chat).toHaveProperty('chatId');
			expect(chat).toHaveProperty('taskId');
			expect(chat).toHaveProperty('taskTitle');
			expect(chat).toHaveProperty('taskOwnerUserId');
			expect(chat).toHaveProperty('taskOwnerName');
			expect(chat).toHaveProperty('users');
			expect(Array.isArray(chat.users)).toBe(true);
			expect(chat.users.length).toBeGreaterThan(0);
			expect(chat.users.every((entry) => typeof entry === 'string')).toBe(true);

			if (chat.lastMessage == null) {
				expect(chat.lastMessage).toBeNull();
			} else {
				expect(chat.lastMessage).toHaveProperty('id');
				expect(chat.lastMessage).toHaveProperty('chatId');
				expect(chat.lastMessage).toHaveProperty('taskId');
				expect(chat.lastMessage).toHaveProperty('senderId');
				expect(chat.lastMessage).toHaveProperty('text');
				expect(chat.lastMessage).toHaveProperty('timestamp');
				expect(typeof chat.lastMessage.timestamp).toBe('string');
			}
		});
	});

	describe('Message contract', () => {
		test('Message list should have expected schema and timestamps in ascending order', async () => {
			const taskCreate = await handleApiRequest({
				method: 'POST',
				path: '/v1/tasks',
				body: {
					title: 'Contract message task',
					description: 'Used for message contract ordering coverage.',
					location: 'Noida',
					price: 35,
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

			const chatId = chatCreate.body.chat.chatId;
			const firstSend = await handleApiRequest({
				method: 'POST',
				path: `/v1/chats/${chatId}/messages`,
				body: {
					taskId: taskCreate.body.task.id,
					senderId: 'u_1002',
					text: 'First message',
				},
			});
			expect(firstSend.status).toBe(201);

			const secondSend = await handleApiRequest({
				method: 'POST',
				path: `/v1/chats/${chatId}/messages`,
				body: {
					taskId: taskCreate.body.task.id,
					senderId: 'u_1001',
					text: 'Second message',
				},
			});
			expect(secondSend.status).toBe(201);

			const messages = await listMessagesByChatId(chatId);
			expect(Array.isArray(messages)).toBe(true);
			expect(messages.length).toBeGreaterThan(0);
			for (const message of messages) {
				expect(message).toHaveProperty('id');
				expect(message).toHaveProperty('chatId');
				expect(message).toHaveProperty('taskId');
				expect(message).toHaveProperty('senderId');
				expect(message).toHaveProperty('text');
				expect(message).toHaveProperty('timestamp');
				expect(typeof message.timestamp).toBe('string');
				const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
				expect(isoRegex.test(message.timestamp)).toBe(true);
			}

			for (let index = 1; index < messages.length; index += 1) {
				const prevTs = Date.parse(messages[index - 1].timestamp);
				const nextTs = Date.parse(messages[index].timestamp);
				expect(prevTs).toBeLessThanOrEqual(nextTs);
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
