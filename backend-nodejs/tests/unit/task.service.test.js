const taskService = require('../../src/services/task.service');

describe('task.service', () => {
	test('fetchTasks supports executionMode filtering', async () => {
		const result = await taskService.fetchTasks({executionMode: 'offline'});
		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data.every((task) => task.executionMode === 'offline')).toBe(true);
	});

	test('fetchMyTaskHistory requires user auth', async () => {
		const result = await taskService.fetchMyTaskHistory({});
		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
	});

	test('fetchMyTaskHistory includes tasks posted or accepted by the user', async () => {
		const created = await taskService.createTaskEntry({
			title: 'Task History Coverage Task',
			description: 'Task history coverage from unit test.',
			location: 'Test City',
			price: 30,
			scheduledAt: new Date().toISOString(),
			executionMode: 'offline',
			postedByUserId: 'u_1001',
			postedByName: 'Aarav Sharma',
		});

		expect(created.ok).toBe(true);

		const accepted = await taskService.acceptTaskEntry(created.data.id, {
			acceptedByUserId: 'u_1002',
		});

		expect(accepted.ok).toBe(true);

		const historyAsOwner = await taskService.fetchMyTaskHistory({userId: 'u_1001'});
		expect(historyAsOwner.ok).toBe(true);
		expect(historyAsOwner.data.some((task) => task.id === created.data.id)).toBe(true);

		const historyAsHelper = await taskService.fetchMyTaskHistory({userId: 'u_1002'});
		expect(historyAsHelper.ok).toBe(true);
		expect(historyAsHelper.data.some((task) => task.id === created.data.id)).toBe(true);
	});

	test('fetchTaskById returns 404 for unknown task', async () => {
		const result = await taskService.fetchTaskById('missing-task-id');
		expect(result.ok).toBe(false);
		expect(result.status).toBe(404);
	});

	test('createTaskEntry validates required payload fields', async () => {
		const result = await taskService.createTaskEntry({title: 'Incomplete payload'});
		expect(result.ok).toBe(false);
		expect(result.status).toBe(400);
	});

	test('created task can be accepted by non-owner', async () => {
		const createResult = await taskService.createTaskEntry({
			title: 'Unit Test Task',
			description: 'Task created from unit test.',
			location: 'Test City',
			price: 20,
			scheduledAt: new Date().toISOString(),
			executionMode: 'offline',
			postedByUserId: 'u_1001',
			postedByName: 'Aarav Sharma',
		});

		expect(createResult.ok).toBe(true);
		expect(createResult.status).toBe(201);

		const acceptResult = await taskService.acceptTaskEntry(createResult.data.id, {
			acceptedByUserId: 'u_1002',
		});

		expect(acceptResult.ok).toBe(true);
		expect(acceptResult.status).toBe(200);
		expect(acceptResult.data.acceptedByUserId).toBe('u_1002');
	});
});
