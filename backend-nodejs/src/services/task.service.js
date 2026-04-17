const {
	listTasks,
	getTaskById,
	createTask,
	acceptTask,
} = require('../repositories/task.repository');
const {
	validateCreateTaskPayload,
	validateAcceptTaskPayload,
} = require('../validators/task.validator');
const {success, failure} = require('../utils/response.util');

function fetchTasks() {
	return Promise.resolve(listTasks()).then((tasks) => success(200, tasks));
}

async function fetchTaskById(taskId) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	return success(200, task);
}

async function createTaskEntry(payload = {}) {
	const validation = validateCreateTaskPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Title, description, location, price, and scheduledAt are required.');
	}

	const task = await createTask(validation.value);
	return success(201, task);
}

async function acceptTaskEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateAcceptTaskPayload(payload);
	const updatedTask = await acceptTask(taskId, validation.value.acceptedByUserId);
	return success(200, updatedTask);
}

module.exports = {
	fetchTasks,
	fetchTaskById,
	createTaskEntry,
	acceptTaskEntry,
};
