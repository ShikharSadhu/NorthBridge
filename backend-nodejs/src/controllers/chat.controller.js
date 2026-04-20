const taskController = require('./task.controller');

module.exports = {
	listChatsController: taskController.listChatsController,
	getChatMessagesController: taskController.getChatMessagesController,
	sendMessageController: taskController.sendMessageController,
	openOrCreateTaskChatController: taskController.openOrCreateTaskChatController,
};
