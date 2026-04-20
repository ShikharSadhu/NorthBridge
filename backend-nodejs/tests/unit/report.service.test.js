const taskService = require('../../src/services/task.service');
const chatService = require('../../src/services/chat.service');
const {upsertUserFromAuth} = require('../../src/repositories/user.repository');
const reportService = require('../../src/services/report.service');

describe('report.service', () => {
	test('createUserReportEntry requires authenticated reporter', async () => {
		const result = await reportService.createUserReportEntry('u_1002', {
			reason: 'Spam profile',
			details: 'Automated spam account',
		});

		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
	});

	test('createUserReportEntry stores a report for the authenticated reporter', async () => {
		await upsertUserFromAuth({
			userId: 'u_2001',
			name: 'Target User',
			email: 'target.user@example.test',
			location: 'Test City',
		});

		const createResult = await taskService.createTaskEntry({
			title: 'Report Test Task',
			description: 'Task used to create a report target.',
			location: 'Test City',
			price: 15,
			scheduledAt: new Date().toISOString(),
			executionMode: 'offline',
			postedByUserId: 'u_1001',
			postedByName: 'Aarav Sharma',
		});

		expect(createResult.ok).toBe(true);

		const chatResult = await chatService.openOrCreateChatEntry({
			taskId: createResult.data.id,
			participantUserId: 'u_1002',
		});

		expect(chatResult.ok).toBe(true);

		const result = await reportService.createUserReportEntry(
			'u_2001',
			{
				reason: 'Spam profile',
				details: 'Automated spam account',
			},
			'u_1001',
		);

		expect(result.ok).toBe(true);
		expect(result.status).toBe(201);
		expect(result.data).toHaveProperty('targetType', 'user');
		expect(result.data).toHaveProperty('reporterUserId', 'u_1001');
	});

	test('listReportsForReporter returns only current reporter reports', async () => {
		const taskResult = await taskService.createTaskEntry({
			title: 'Message Report Task',
			description: 'Task used for message report coverage.',
			location: 'Test City',
			price: 25,
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
			text: 'Report target message',
		});

		expect(messageResult.ok).toBe(true);

		const createResult = await reportService.createMessageReportEntry(
			messageResult.data.id,
			{
				reason: 'Harassment',
				details: 'Unsafe content',
			},
			'u_1001',
		);

		expect(createResult.ok).toBe(true);

		const listResult = await reportService.listReportsForReporter({userId: 'u_1001'});
		expect(listResult.ok).toBe(true);
		expect(listResult.status).toBe(200);
		expect(listResult.data.every((report) => report.reporterUserId === 'u_1001')).toBe(true);
	});

	test('updateReportStatusEntry changes report status', async () => {
		await upsertUserFromAuth({
			userId: 'u_2002',
			name: 'Moderation Target',
			email: 'moderation.target@example.test',
			location: 'Test City',
		});

		const createResult = await reportService.createUserReportEntry(
			'u_2002',
			{
				reason: 'Abuse',
				details: 'Needs review',
			},
			'u_1001',
		);

		expect(createResult.ok).toBe(true);

		const updateResult = await reportService.updateReportStatusEntry(createResult.data.id, {
			status: 'reviewing',
		});

		expect(updateResult.ok).toBe(true);
		expect(updateResult.status).toBe(200);
		expect(updateResult.data).toHaveProperty('status', 'reviewing');
	});
});