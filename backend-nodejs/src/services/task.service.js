const {
	listTasks,
	getTaskById,
	createTask,
	acceptTask,
	requestTaskCompletion,
	confirmTaskCompletion,
	declineTaskCompletion,
	submitTaskRating,
	cancelTask,
} = require('../repositories/task.repository');
const {
	validateCreateTaskPayload,
	validateAcceptTaskPayload,
	validateRequestTaskCompletionPayload,
	validateTaskOwnerPayload,
	validateSubmitTaskRatingPayload,
	validateTaskListPayload,
} = require('../validators/task.validator');
const {success, failure} = require('../utils/response.util');
const {isValidGeoPoint, calculateRoundedDistanceKm} = require('../utils/geo.utils');
const eventService = require('./event.service');

function parseNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
}

function parsePositiveInt(value, fallback) {
	const parsed = parseNumber(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
}

function deriveTaskStatus(task) {
	if (!task || typeof task !== 'object') {
		return 'open';
	}

	if (typeof task.status === 'string' && task.status.trim()) {
		return task.status.trim();
	}

	if (task.isActive === false) {
		return 'completed';
	}

	if (task.acceptedByUserId) {
		return 'accepted';
	}

	return 'open';
}

function filterTasks(tasks, payload = {}) {
	let filtered = [...tasks];

	const executionMode = typeof payload.executionMode === 'string' ? payload.executionMode.trim().toLowerCase() : '';
	if (executionMode === 'online' || executionMode === 'offline') {
		filtered = filtered.filter((task) => task.executionMode === executionMode);
	}

	const status = typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : '';
	if (status) {
		filtered = filtered.filter((task) => deriveTaskStatus(task) === status);
	}

	const minPrice = parseNumber(payload.minPrice);
	if (typeof minPrice === 'number') {
		filtered = filtered.filter((task) => task.price >= minPrice);
	}

	const maxPrice = parseNumber(payload.maxPrice);
	if (typeof maxPrice === 'number') {
		filtered = filtered.filter((task) => task.price <= maxPrice);
	}

	return filtered;
}

function paginateTasks(tasks, payload = {}) {
	const pageSize = parsePositiveInt(payload.pageSize, 0);
	if (!pageSize) {
		return tasks;
	}

	const page = parsePositiveInt(payload.page, 1);
	const start = (page - 1) * pageSize;
	return tasks.slice(start, start + pageSize);
}

function sortTasks(tasks, sortBy) {
	const normalizedSort = typeof sortBy === 'string' ? sortBy.trim() : '';
	if (!normalizedSort) {
		return tasks;
	}

	const sorted = [...tasks];
	switch (normalizedSort) {
		case 'distance':
			sorted.sort((left, right) => left.distanceKm - right.distanceKm);
			return sorted;
		case 'closestDate':
			sorted.sort((left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt));
			return sorted;
		case 'latestDate':
			sorted.sort((left, right) => new Date(right.scheduledAt) - new Date(left.scheduledAt));
			return sorted;
		case 'online':
			return sorted.filter((task) => task.executionMode === 'online');
		case 'offline':
			return sorted.filter((task) => task.executionMode === 'offline');
		default:
			return sorted;
	}
}

function parseGeoCoordinate(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
}

function resolveAcceptorPoint(payload = {}) {
	const lat = parseGeoCoordinate(payload.acceptorLat);
	const lng = parseGeoCoordinate(payload.acceptorLng);
	const point = {lat, lng};
	return isValidGeoPoint(point) ? point : null;
}

function applyAcceptorDistance(task, acceptorPoint) {
	if (!task || typeof task !== 'object') {
		return task;
	}

	if (!acceptorPoint || !isValidGeoPoint(acceptorPoint)) {
		return task;
	}

	if (!isValidGeoPoint(task.locationGeo)) {
		return task;
	}

	return {
		...task,
		distanceKm: calculateRoundedDistanceKm(acceptorPoint, task.locationGeo, 1),
	};
}

function applyAcceptorDistanceToList(tasks, payload = {}) {
	const acceptorPoint = resolveAcceptorPoint(payload);
	if (!acceptorPoint) {
		return tasks;
	}

	return tasks.map((task) => applyAcceptorDistance(task, acceptorPoint));
}

function fetchTasks(payload = {}) {
	const validation = validateTaskListPayload(payload);
	if (!validation.valid) {
		return Promise.resolve(failure(400, 'Invalid task query parameters.'));
	}

	return Promise.resolve(listTasks()).then((tasks) => {
		const withDistance = applyAcceptorDistanceToList(tasks, validation.value);
		const filtered = filterTasks(withDistance, validation.value);
		const sorted = sortTasks(filtered, validation.value.sortBy);
		return success(200, paginateTasks(sorted, validation.value));
	});
}

async function fetchMyTaskHistory(payload = {}) {
	const validation = validateTaskListPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Invalid task query parameters.');
	}

	const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
	if (!userId) {
		return failure(401, 'User is not authenticated.');
	}

	const tasks = await listTasks();
	const withDistance = applyAcceptorDistanceToList(tasks, validation.value);
	const history = withDistance.filter(
		(task) => task.acceptedByUserId === userId || task.postedByUserId === userId,
	);
	const sorted = sortTasks(history, validation.value.sortBy || 'latestDate');
	return success(200, paginateTasks(sorted, validation.value));
}

async function fetchTaskById(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	return success(200, applyAcceptorDistance(task, resolveAcceptorPoint(payload)));
}

async function createTaskEntry(payload = {}) {
	const validation = validateCreateTaskPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Title, description, location, price, scheduledAt, and executionMode are required.');
	}

	const task = await createTask(validation.value);
	// publish event but don't block response
	Promise.resolve(eventService.notifyTaskCreated(task)).catch(() => {});
	return success(201, task);
}

async function acceptTaskEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}
	if (!task.isActive || task.status === 'cancelled' || task.status === 'completed') {
		return failure(409, 'Task is closed and cannot be accepted.');
	}

	const validation = validateAcceptTaskPayload(payload);
	if (!validation.valid) {
		return failure(400, 'acceptedByUserId is required.');
	}
	if (task.postedByUserId === validation.value.acceptedByUserId) {
		return failure(400, 'You cannot accept your own task.');
	}
	if (task.acceptedByUserId && task.acceptedByUserId !== validation.value.acceptedByUserId) {
		return failure(409, 'Task already accepted by another user.');
	}

	const updatedTask = await acceptTask(taskId, validation.value.acceptedByUserId);
	Promise.resolve(eventService.notifyTaskAccepted(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function requestTaskCompletionEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateRequestTaskCompletionPayload(payload);
	if (!validation.valid) {
		return failure(400, 'helperUserId is required.');
	}
	if (!task.isActive) {
		return failure(409, 'Task is already completed.');
	}
	if (task.acceptedByUserId !== validation.value.helperUserId) {
		return failure(403, 'Only the accepted helper can request completion.');
	}
	if (task.completionRequestedByUserId) {
		return failure(409, 'Completion is already requested for this task.');
	}

	const updatedTask = await requestTaskCompletion(taskId, validation.value.helperUserId);
	Promise.resolve(eventService.notifyTaskCompletionRequested(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function confirmTaskCompletionEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateTaskOwnerPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId is required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can confirm completion.');
	}
	if (!task.isActive) {
		return failure(409, 'Task is already completed.');
	}
	if (!task.completionRequestedByUserId) {
		return failure(409, 'No pending completion request.');
	}

	const updatedTask = await confirmTaskCompletion(taskId);
	Promise.resolve(eventService.notifyTaskCompleted(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function declineTaskCompletionEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateTaskOwnerPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId is required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can decline completion.');
	}
	if (!task.isActive) {
		return failure(409, 'Task is already completed.');
	}
	if (!task.completionRequestedByUserId) {
		return failure(409, 'No pending completion request.');
	}

	const updatedTask = await declineTaskCompletion(taskId);
	Promise.resolve(eventService.notifyTaskCompletionDeclined(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function submitTaskRatingEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateSubmitTaskRatingPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId and a rating between 1 and 5 are required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can submit rating.');
	}
	if (task.isActive) {
		return failure(409, 'Task is not completed yet.');
	}
	if (!task.isRatingPending) {
		return failure(409, 'No pending rating for this task.');
	}

	const updatedTask = await submitTaskRating(taskId, validation.value.rating);
	// rating events are mostly internal; if needed, hook here
	return success(200, updatedTask);
}

async function completeTaskEntry(taskId, payload = {}) {
	return confirmTaskCompletionEntry(taskId, payload);
}

async function cancelTaskEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateTaskOwnerPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId is required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can cancel task.');
	}
	if (!task.isActive) {
		return failure(409, 'Task is already closed.');
	}

	const updatedTask = await cancelTask(taskId);
	Promise.resolve(eventService.notifyTaskCancelled(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

module.exports = {
	fetchTasks,
	fetchTaskById,
	createTaskEntry,
	acceptTaskEntry,
	requestTaskCompletionEntry,
	confirmTaskCompletionEntry,
	declineTaskCompletionEntry,
	submitTaskRatingEntry,
	completeTaskEntry,
	cancelTaskEntry,
	fetchMyTaskHistory,
};
