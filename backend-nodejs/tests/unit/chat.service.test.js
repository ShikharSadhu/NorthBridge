const taskService = require('../../src/services/task.service');
const chatService = require('../../src/services/chat.service');

describe('chat.service', () => {
	test('openOrCreateChatEntry creates a chat for task participants', async () => {
		const taskResult = await taskService.createTaskEntry({
			title: 'Chat Service Task',
			description: 'Task used for chat service coverage.',
			location: 'Test City',
			price: 40,
			scheduledAt: new Date().toISOString(),
			executionMode: 'offline',
			postedByUserId: 'u_1001',
			postedByName: 'Aarav Sharma',
		});

		expect(taskResult.ok).toBe(true);

		const chatResult = await chatService.openOrCreateChatEntry({
			taskId: taskResult.data.id,
			participantUserId: 'u_1002',
		});

		expect(chatResult.ok).toBe(true);
		expect([200, 201]).toContain(chatResult.status);
		expect(chatResult.data).toHaveProperty('chatId');
		expect(chatResult.data.users).toEqual(expect.arrayContaining(['u_1001', 'u_1002']));
	});

	test('createMessageEntry persists image attachments and payment flag', async () => {
		const taskResult = await taskService.createTaskEntry({
			title: 'Message Attachment Task',
			description: 'Task used for message attachment coverage.',
			location: 'Test City',
			price: 55,
			scheduledAt: new Date().toISOString(),
			executionMode: 'offline',
			postedByUserId: 'u_1001',
			postedByName: 'Aarav Sharma',
		});

		expect(taskResult.ok).toBe(true);

		const chatResult = await chatService.openOrCreateChatEntry({
			taskId: taskResult.data.id,
			participantUserId: 'u_1002',
		});

		expect(chatResult.ok).toBe(true);

		const messageResult = await chatService.createMessageEntry({
			chatId: chatResult.data.chatId,
			taskId: taskResult.data.id,
			senderId: 'u_1002',
			text: '',
			imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
			isPaymentRequest: true,
		});

		expect(messageResult.ok).toBe(true);
		expect(messageResult.status).toBe(201);
		expect(messageResult.data).toHaveProperty('imageDataUrl');
		expect(messageResult.data.imageDataUrl).toContain('data:image/png;base64,');
		expect(messageResult.data).toHaveProperty('isPaymentRequest', true);
	});
});
