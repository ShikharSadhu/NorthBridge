const {
	listTasks,
	listTasksByQuery,
	getTaskById,
	createTask,
	requestTaskAcceptance,
	confirmTaskAcceptance,
	declineTaskAcceptance,
	requestTaskCompletion,
	confirmTaskCompletion,
	declineTaskCompletion,
	submitTaskRating,
	cancelTask,
} = require('../repositories/task.repository');
const {submitRatingForUser} = require('../repositories/user.repository');
const {
	getChatByTaskAndUsers,
	createChat,
	updateChat,
	updateChatLastMessage,
} = require('../repositories/chat.repository');
const {createMessage} = require('../repositories/message.repository');
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
const {resolveLocationPoint} = require('../utils/location-resolver.util');
const {getPrivateUserById} = require('../repositories/user.repository');
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

function matchesRequestedStatus(task, requestedStatus) {
	const normalizedStatus =
		typeof requestedStatus === 'string' ? requestedStatus.trim().toLowerCase() : '';
	if (!normalizedStatus) {
		return true;
	}

	if (normalizedStatus === 'open') {
		return task?.isActive !== false && !task?.acceptedByUserId && task?.status !== 'cancelled';
	}

	return deriveTaskStatus(task) === normalizedStatus;
}

function shouldUseDirectQuery(distanceContext = {}) {
	const normalizedStatus =
		typeof distanceContext.status === 'string'
			? distanceContext.status.trim().toLowerCase()
			: '';
	if (normalizedStatus === 'open') {
		return false;
	}

	return Boolean(
		normalizedStatus ||
			distanceContext.executionMode ||
			distanceContext.postedByUserId ||
			distanceContext.acceptedByUserId ||
			distanceContext.pageSize,
	);
}

function filterTasks(tasks, payload = {}) {
	let filtered = [...tasks];

	const executionMode = typeof payload.executionMode === 'string' ? payload.executionMode.trim().toLowerCase() : '';
	if (executionMode === 'online' || executionMode === 'offline') {
		filtered = filtered.filter((task) => task.executionMode === executionMode);
	}

	const status = typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : '';
	if (status) {
		filtered = filtered.filter((task) => matchesRequestedStatus(task, status));
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

async function resolveAcceptorPoint(payload = {}) {
	const lat = parseGeoCoordinate(payload.acceptorLat);
	const lng = parseGeoCoordinate(payload.acceptorLng);
	const point = {lat, lng};
	if (isValidGeoPoint(point)) {
		return point;
	}

	const viewerLocation =
		typeof payload.viewerLocation === 'string' ? payload.viewerLocation.trim() : '';
	if (viewerLocation) {
		const resolvedViewer = resolveLocationPoint(viewerLocation);
		if (resolvedViewer) {
			return {lat: resolvedViewer.lat, lng: resolvedViewer.lng};
		}
	}

	const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
	if (!userId) {
		return null;
	}

	const user = await getPrivateUserById(userId);
	if (!user || !user.location) {
		return null;
	}

	const resolvedUserLocation = resolveLocationPoint(user.location);
	return resolvedUserLocation
		? {lat: resolvedUserLocation.lat, lng: resolvedUserLocation.lng}
		: null;
}

function resolveTaskPoint(task) {
	if (!task || typeof task !== 'object') {
		return null;
	}

	if (isValidGeoPoint(task.locationGeo)) {
		return task.locationGeo;
	}

	const resolved = resolveLocationPoint(task.location);
	return resolved ? {lat: resolved.lat, lng: resolved.lng} : null;
}

function applyAcceptorDistance(task, acceptorPoint) {
	if (!task || typeof task !== 'object') {
		return task;
	}

	if (!acceptorPoint || !isValidGeoPoint(acceptorPoint)) {
		return task;
	}

	const taskPoint = resolveTaskPoint(task);
	if (!taskPoint) {
		return task;
	}

	return {
		...task,
		locationGeo: task.locationGeo || taskPoint,
		distanceKm: calculateRoundedDistanceKm(acceptorPoint, taskPoint, 1),
	};
}

async function applyAcceptorDistanceToList(tasks, payload = {}) {
	const acceptorPoint = await resolveAcceptorPoint(payload);
	if (!acceptorPoint) {
		return tasks.map((task) => {
			const taskPoint = resolveTaskPoint(task);
			if (!taskPoint) {
				return task;
			}
			return {
				...task,
				locationGeo: task.locationGeo || taskPoint,
			};
		});
	}

	return tasks.map((task) => applyAcceptorDistance(task, acceptorPoint));
}

function fetchTasks(payload = {}) {
	const validation = validateTaskListPayload(payload);
	if (!validation.valid) {
		return Promise.resolve(failure(400, 'Invalid task query parameters.'));
	}

	const distanceContext = {
		...validation.value,
		userId: typeof payload.userId === 'string' ? payload.userId : undefined,
		viewerLocation:
			typeof payload.viewerLocation === 'string'
				? payload.viewerLocation
				: validation.value.viewerLocation,
	};

	const listOperation = shouldUseDirectQuery(distanceContext)
		? listTasksByQuery(distanceContext)
		: listTasks();

	return Promise.resolve(listOperation).then(async (tasks) => {
		const withDistance = await applyAcceptorDistanceToList(tasks, distanceContext);
		const filtered = filterTasks(withDistance, distanceContext);
		const sorted = sortTasks(filtered, distanceContext.sortBy);
		return success(200, paginateTasks(sorted, distanceContext));
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

	const distanceContext = {
		...validation.value,
		userId,
		viewerLocation:
			typeof payload.viewerLocation === 'string'
				? payload.viewerLocation
				: validation.value.viewerLocation,
	};

	const [postedTasks, acceptedTasks] = await Promise.all([
		listTasksByQuery({...distanceContext, postedByUserId: userId}),
		listTasksByQuery({...distanceContext, acceptedByUserId: userId}),
	]);
	const historyById = new Map();
	for (const task of [...postedTasks, ...acceptedTasks]) {
		if (task?.id) {
			historyById.set(task.id, task);
		}
	}

	const withDistance = await applyAcceptorDistanceToList(
		Array.from(historyById.values()),
		distanceContext,
	);
	const history = withDistance.filter(
		(task) => task.acceptedByUserId === userId || task.postedByUserId === userId,
	);
	const sorted = sortTasks(history, distanceContext.sortBy || 'latestDate');
	return success(200, paginateTasks(sorted, distanceContext));
}

async function fetchTaskById(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const acceptorPoint = await resolveAcceptorPoint({
		...payload,
		userId: typeof payload.userId === 'string' ? payload.userId : undefined,
	});
	return success(200, applyAcceptorDistance(task, acceptorPoint));
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

async function ensureAcceptanceChat(task, helperUserId) {
	const existingChat = await getChatByTaskAndUsers(task.id, task.postedByUserId, helperUserId);
	if (existingChat?.isClosed) {
		return {chat: existingChat, blocked: true};
	}

	if (existingChat) {
		return {chat: existingChat, blocked: false};
	}

	const chat = await createChat({
		taskId: task.id,
		taskTitle: task.title,
		taskOwnerUserId: task.postedByUserId,
		taskOwnerName: task.postedByName,
		users: [task.postedByUserId, helperUserId],
		isClosed: false,
		lastMessage: {
			id: '',
			chatId: '',
			taskId: task.id,
			senderId: task.postedByUserId,
			text: '',
			timestamp: new Date().toISOString(),
		},
	});
	return {chat, blocked: false};
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
	if (task.acceptedByUserId) {
		if (task.acceptedByUserId === validation.value.acceptedByUserId) {
			return failure(409, 'Task is already accepted by you.');
		}
		return failure(409, 'Task already accepted by another user.');
	}
	if (
		task.pendingAcceptanceByUserId &&
		task.pendingAcceptanceByUserId !== validation.value.acceptedByUserId
	) {
		return failure(409, 'Another acceptance request is already pending.');
	}

	const chatResult = await ensureAcceptanceChat(task, validation.value.acceptedByUserId);
	if (chatResult.blocked) {
		return failure(409, 'Task owner already declined this chat request.');
	}

	const updatedTask = await requestTaskAcceptance(taskId, validation.value.acceptedByUserId);
	const requestMessage = await createMessage({
		chatId: chatResult.chat.chatId,
		taskId: task.id,
		senderId: validation.value.acceptedByUserId,
		text: 'I would like to accept this task. Please accept or decline my request.',
		timestamp: new Date().toISOString(),
	});
	const updatedChat = await updateChatLastMessage(chatResult.chat.chatId, requestMessage);
	Promise.resolve(eventService.notifyNewMessage(updatedChat, requestMessage)).catch(() => {});
	Promise.resolve(eventService.notifyTaskAcceptanceRequested(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function confirmTaskAcceptanceEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateTaskOwnerPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId is required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can confirm acceptance.');
	}
	if (task.acceptedByUserId) {
		return failure(409, 'Task is already accepted.');
	}
	if (!task.pendingAcceptanceByUserId) {
		return failure(409, 'No pending acceptance request.');
	}

	const updatedTask = await confirmTaskAcceptance(taskId);
	Promise.resolve(eventService.notifyTaskAccepted(updatedTask)).catch(() => {});
	return success(200, updatedTask);
}

async function declineTaskAcceptanceEntry(taskId, payload = {}) {
	const task = await getTaskById(taskId);
	if (!task) {
		return failure(404, 'Task not found.');
	}

	const validation = validateTaskOwnerPayload(payload);
	if (!validation.valid) {
		return failure(400, 'ownerUserId is required.');
	}
	if (task.postedByUserId !== validation.value.ownerUserId) {
		return failure(403, 'Only task owner can decline acceptance.');
	}
	if (task.acceptedByUserId) {
		return failure(409, 'Task is already accepted.');
	}
	if (!task.pendingAcceptanceByUserId) {
		return failure(409, 'No pending acceptance request.');
	}

	const helperUserId = task.pendingAcceptanceByUserId;
	const chat = await getChatByTaskAndUsers(task.id, task.postedByUserId, helperUserId);
	const updatedTask = await declineTaskAcceptance(taskId);
	if (chat) {
		await updateChat(chat.chatId, {isClosed: true});
		const declineMessage = await createMessage({
			chatId: chat.chatId,
			taskId: task.id,
			senderId: task.postedByUserId,
			text: 'Your acceptance request was declined. This chat is now closed.',
			timestamp: new Date().toISOString(),
		});
		const finalChat = await updateChatLastMessage(chat.chatId, declineMessage);
		Promise.resolve(eventService.notifyNewMessage(finalChat, declineMessage)).catch(() => {});
	}
	Promise.resolve(eventService.notifyTaskAcceptanceDeclined(updatedTask, helperUserId)).catch(() => {});
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
	if (updatedTask?.completedByUserId) {
		await submitRatingForUser(updatedTask.completedByUserId, validation.value.rating);
	}
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
	confirmTaskAcceptanceEntry,
	declineTaskAcceptanceEntry,
	requestTaskCompletionEntry,
	confirmTaskCompletionEntry,
	declineTaskCompletionEntry,
	submitTaskRatingEntry,
	completeTaskEntry,
	cancelTaskEntry,
	fetchMyTaskHistory,
};
