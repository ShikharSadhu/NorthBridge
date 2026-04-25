const WebSocket = require('ws');
const {closeWs, connectWs, waitForMessage} = require('../helpers/ws-client');

async function postJson(baseUrl, path, body) {
	const response = await fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
	const payload = await response.json();
	return {
		status: response.status,
		body: payload,
	};
}

describe('websocket integration', () => {
	let originalOverride;
	let started;
	let baseUrl;
	let wsUrl;

	beforeAll(async () => {
		originalOverride = process.env.ALLOW_WS_AUTH_OVERRIDE;
		process.env.ALLOW_WS_AUTH_OVERRIDE = 'true';
		const {startServer} = require('../../src/server');
		started = await startServer({port: 0, host: '127.0.0.1'});
		baseUrl = `http://${started.host}:${started.port}`;
		wsUrl = `ws://${started.host}:${started.port}`;
	});

	afterAll(async () => {
		process.env.ALLOW_WS_AUTH_OVERRIDE = originalOverride;
		if (started?.stop) {
			await started.stop();
		}
	});

	test('rejects unauthenticated websocket clients', async () => {
		await new Promise((resolve, reject) => {
			const ws = new WebSocket(wsUrl);
			const timer = setTimeout(() => {
				ws.terminate();
				reject(new Error('Unauthenticated websocket was not closed.'));
			}, 3000);

			ws.once('close', () => {
				clearTimeout(timer);
				resolve();
			});
			ws.once('error', () => {});
		});
	});

	test('publishes task and chat events to connected users', async () => {
		const ownerWs = await connectWs(`${wsUrl}?x-user-id=u_ws_owner`);
		const helperWs = await connectWs(`${wsUrl}?x-user-id=u_ws_helper`);

		try {
			const ownerTaskCreated = waitForMessage(ownerWs, (message) => message.type === 'TASK_CREATED');
			const helperTaskCreated = waitForMessage(helperWs, (message) => message.type === 'TASK_CREATED');

			const createTaskResult = await postJson(baseUrl, '/v1/tasks', {
				title: 'WebSocket integration task',
				description: 'Verify real-time task creation.',
				location: 'Delhi',
				price: 64,
				scheduledAt: new Date().toISOString(),
				executionMode: 'offline',
				postedByUserId: 'u_ws_owner',
				postedByName: 'WS Owner',
			});

			expect(createTaskResult.status).toBe(201);
			const task = createTaskResult.body.task;

			await expect(ownerTaskCreated).resolves.toMatchObject({
				type: 'TASK_CREATED',
				data: {id: task.id, postedByUserId: 'u_ws_owner'},
			});
			await expect(helperTaskCreated).resolves.toMatchObject({
				type: 'TASK_CREATED',
				data: {id: task.id, postedByUserId: 'u_ws_owner'},
			});

			const ownerTaskAccepted = waitForMessage(ownerWs, (message) => message.type === 'TASK_ACCEPTED');
			const acceptResult = await postJson(baseUrl, `/v1/tasks/${task.id}/accept`, {
				acceptedByUserId: 'u_ws_helper',
			});

			expect(acceptResult.status).toBe(200);
			await expect(ownerTaskAccepted).resolves.toMatchObject({
				type: 'TASK_ACCEPTED',
				data: {taskId: task.id, acceptedBy: 'u_ws_helper'},
			});

			const chatResult = await postJson(baseUrl, '/v1/chats', {
				taskId: task.id,
				participantUserId: 'u_ws_helper',
			});

			expect([200, 201]).toContain(chatResult.status);
			const chat = chatResult.body.chat;

			const ownerNewMessage = waitForMessage(ownerWs, (message) => message.type === 'NEW_MESSAGE');
			const helperNewMessage = waitForMessage(helperWs, (message) => message.type === 'NEW_MESSAGE');
			const messageResult = await postJson(baseUrl, `/v1/chats/${chat.chatId}/messages`, {
				taskId: task.id,
				senderId: 'u_ws_helper',
				text: 'I can help with this task.',
			});

			expect(messageResult.status).toBe(201);
			await expect(ownerNewMessage).resolves.toMatchObject({
				type: 'NEW_MESSAGE',
				data: {
					chatId: chat.chatId,
					taskId: task.id,
					senderId: 'u_ws_helper',
					receiverId: 'u_ws_owner',
					text: 'I can help with this task.',
				},
			});
			await expect(helperNewMessage).resolves.toMatchObject({
				type: 'NEW_MESSAGE',
				data: {
					chatId: chat.chatId,
					taskId: task.id,
					senderId: 'u_ws_helper',
					receiverId: 'u_ws_owner',
				},
			});

			const ownerPaymentRequested = waitForMessage(
				ownerWs,
				(message) => message.type === 'PAYMENT_REQUESTED',
			);
			const helperPaymentRequested = waitForMessage(
				helperWs,
				(message) => message.type === 'PAYMENT_REQUESTED',
			);
			const paymentResult = await postJson(baseUrl, `/v1/chats/${chat.chatId}/payment-requests`, {
				taskId: task.id,
				requesterUserId: 'u_ws_helper',
				receiverUserId: 'u_ws_owner',
				amount: 64,
				note: 'Payment request over realtime.',
			});

			expect(paymentResult.status).toBe(201);
			await expect(ownerPaymentRequested).resolves.toMatchObject({
				type: 'PAYMENT_REQUESTED',
				data: {
					id: paymentResult.body.paymentRequest.id,
					requesterUserId: 'u_ws_helper',
					receiverUserId: 'u_ws_owner',
					status: 'pending',
				},
			});
			await expect(helperPaymentRequested).resolves.toMatchObject({
				type: 'PAYMENT_REQUESTED',
				data: {
					id: paymentResult.body.paymentRequest.id,
					requesterUserId: 'u_ws_helper',
					receiverUserId: 'u_ws_owner',
					status: 'pending',
				},
			});
		} finally {
			await Promise.all([closeWs(ownerWs), closeWs(helperWs)]);
		}
	});
});
