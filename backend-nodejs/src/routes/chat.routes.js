const {
	getChatMessagesController,
	listChatsController,
	openOrCreateTaskChatController,
	sendMessageController,
} = require('../controllers/chat.controller');

const chatRoutes = [
	{
		method: 'GET',
		path: '/v1/chats',
		execute: (_params, body, userId) =>
			listChatsController({
				userId,
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
		path: '/v1/chats/:chatId/messages',
		execute: (params, body, userId) =>
			getChatMessagesController(params.chatId, {
				userId,
				page:
					typeof body.page === 'number' || typeof body.page === 'string' ? body.page : undefined,
				pageSize:
					typeof body.pageSize === 'number' || typeof body.pageSize === 'string'
						? body.pageSize
						: undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/chats/:chatId/messages',
		execute: (params, body, userId) =>
			sendMessageController(params.chatId, {
				taskId: typeof body.taskId === 'string' ? body.taskId : undefined,
				senderId: typeof body.senderId === 'string' ? body.senderId : undefined,
				text: typeof body.text === 'string' ? body.text : undefined,
				imageDataUrl: typeof body.imageDataUrl === 'string' ? body.imageDataUrl : undefined,
				isPaymentRequest: typeof body.isPaymentRequest === 'boolean' ? body.isPaymentRequest : undefined,
			}, userId),
	},
	{
		method: 'POST',
		path: '/v1/chats',
		execute: (_params, body, userId) =>
			openOrCreateTaskChatController(
				{
					taskId: typeof body.taskId === 'string' ? body.taskId : undefined,
					participantUserId:
						typeof body.participantUserId === 'string'
							? body.participantUserId
							: userId,
				},
				userId,
			),
	},
	{
		method: 'POST',
		path: '/v1/chats/task',
		execute: (_params, body, userId) =>
			openOrCreateTaskChatController({
				helperUserId: typeof body.helperUserId === 'string' ? body.helperUserId : undefined,
				task: body.task && typeof body.task === 'object'
					? {
						id: typeof body.task.id === 'string' ? body.task.id : undefined,
						postedByUserId:
							typeof body.task.postedByUserId === 'string' ? body.task.postedByUserId : undefined,
						postedByName:
							typeof body.task.postedByName === 'string' ? body.task.postedByName : undefined,
						title: typeof body.task.title === 'string' ? body.task.title : undefined,
					}
					: undefined,
			}, userId),
	},
];

module.exports = {
	chatRoutes,
};
