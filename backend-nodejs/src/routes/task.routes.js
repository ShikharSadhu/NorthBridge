const {
	acceptTaskController,
	createTaskController,
	getTaskController,
	listTasksController,
} = require('../controllers/task.controller');

const taskRoutes = [
	{
		method: 'GET',
		path: '/v1/tasks',
		execute: () => listTasksController(),
	},
	{
		method: 'GET',
		path: '/v1/tasks/:taskId',
		execute: (params) => getTaskController(params.taskId),
	},
	{
		method: 'POST',
		path: '/v1/tasks',
		execute: (_params, body) =>
			createTaskController({
				title: typeof body.title === 'string' ? body.title : undefined,
				description: typeof body.description === 'string' ? body.description : undefined,
				location: typeof body.location === 'string' ? body.location : undefined,
				price: typeof body.price === 'number' ? body.price : undefined,
				scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
				executionMode: typeof body.executionMode === 'string' ? body.executionMode : undefined,
				postedByUserId:
					typeof body.postedByUserId === 'string' ? body.postedByUserId : undefined,
				postedByName: typeof body.postedByName === 'string' ? body.postedByName : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/accept',
		execute: (params, body, userId) =>
			acceptTaskController(params.taskId, {
				acceptedByUserId:
					typeof body.acceptedByUserId === 'string' ? body.acceptedByUserId : undefined,
			}, userId),
	},
];

module.exports = {
	taskRoutes,
};
