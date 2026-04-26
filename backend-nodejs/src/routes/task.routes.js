const {
	acceptTaskController,
	confirmTaskAcceptanceController,
	confirmTaskCompletionController,
	createTaskController,
	declineTaskAcceptanceController,
	declineTaskCompletionController,
	completeTaskController,
	cancelTaskController,
	getTaskController,
	getMyTaskHistoryController,
	listTasksWithFilterController,
	requestTaskCompletionController,
	submitTaskRatingController,
} = require('../controllers/task.controller');

const taskRoutes = [
	{
		method: 'GET',
		path: '/v1/tasks',
		execute: (_params, body) =>
			listTasksWithFilterController({
				sortBy: typeof body.sortBy === 'string' ? body.sortBy : undefined,
				executionMode: typeof body.executionMode === 'string' ? body.executionMode : undefined,
				status: typeof body.status === 'string' ? body.status : undefined,
				minPrice:
					typeof body.minPrice === 'number' || typeof body.minPrice === 'string'
						? body.minPrice
						: undefined,
				maxPrice:
					typeof body.maxPrice === 'number' || typeof body.maxPrice === 'string'
						? body.maxPrice
						: undefined,
				page:
					typeof body.page === 'number' || typeof body.page === 'string' ? body.page : undefined,
				pageSize:
					typeof body.pageSize === 'number' || typeof body.pageSize === 'string'
						? body.pageSize
						: undefined,
				acceptorLat:
					typeof body.acceptorLat === 'number' || typeof body.acceptorLat === 'string'
						? body.acceptorLat
						: undefined,
				acceptorLng:
					typeof body.acceptorLng === 'number' || typeof body.acceptorLng === 'string'
						? body.acceptorLng
						: undefined,
			}),
	},
	{
		method: 'GET',
		path: '/v1/tasks/history/me',
		execute: (_params, body, userId) =>
			getMyTaskHistoryController(userId, {
				sortBy: typeof body.sortBy === 'string' ? body.sortBy : undefined,
				page:
					typeof body.page === 'number' || typeof body.page === 'string' ? body.page : undefined,
				pageSize:
					typeof body.pageSize === 'number' || typeof body.pageSize === 'string'
						? body.pageSize
						: undefined,
			}),
	},
	{
		method: 'GET',
		path: '/v1/tasks/:taskId',
		execute: (params, body) =>
			getTaskController(params.taskId, {
				acceptorLat:
					typeof body.acceptorLat === 'number' || typeof body.acceptorLat === 'string'
						? body.acceptorLat
						: undefined,
				acceptorLng:
					typeof body.acceptorLng === 'number' || typeof body.acceptorLng === 'string'
						? body.acceptorLng
						: undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/tasks',
		execute: (_params, body, userId) =>
			createTaskController({
				title: typeof body.title === 'string' ? body.title : undefined,
				description: typeof body.description === 'string' ? body.description : undefined,
				location: typeof body.location === 'string' ? body.location : undefined,
				price: typeof body.price === 'number' ? body.price : undefined,
				scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
				executionMode: typeof body.executionMode === 'string' ? body.executionMode : undefined,
				locationGeo:
					body.locationGeo && typeof body.locationGeo === 'object' && !Array.isArray(body.locationGeo)
						? {
								lat: typeof body.locationGeo.lat === 'number' ? body.locationGeo.lat : undefined,
								lng: typeof body.locationGeo.lng === 'number' ? body.locationGeo.lng : undefined,
						  }
						: undefined,
				postedByUserId:
					typeof body.postedByUserId === 'string' ? body.postedByUserId : undefined,
				postedByName: typeof body.postedByName === 'string' ? body.postedByName : undefined,
			}, userId),
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
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/accept/confirm',
		execute: (params, body, userId) =>
			confirmTaskAcceptanceController(params.taskId, {
				ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/accept/decline',
		execute: (params, body, userId) =>
			declineTaskAcceptanceController(params.taskId, {
				ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/completion/request',
		execute: (params, body, userId) =>
			requestTaskCompletionController(params.taskId, {
				helperUserId: typeof body.helperUserId === 'string' ? body.helperUserId : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/completion/confirm',
		execute: (params, body, userId) =>
			confirmTaskCompletionController(params.taskId, {
				ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/completion/decline',
		execute: (params, body, userId) =>
			declineTaskCompletionController(params.taskId, {
				ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/complete',
		execute: (params, body, userId) =>
			completeTaskController(
				params.taskId,
				{
					ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
				},
				userId,
			),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/cancel',
		execute: (params, body, userId) =>
			cancelTaskController(
				params.taskId,
				{
					ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
				},
				userId,
			),
	},
	{
		method: 'POST',
		path: '/v1/tasks/:taskId/rating',
		execute: (params, body, userId) =>
			submitTaskRatingController(params.taskId, {
				ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
				rating: typeof body.rating === 'number' ? body.rating : undefined,
			}, userId),
	},
];

module.exports = {
	taskRoutes,
};
