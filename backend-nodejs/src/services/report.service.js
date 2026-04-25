const {getPublicUserById} = require('../repositories/user.repository');
const {getMessageById} = require('../repositories/message.repository');
const {
	createReport,
	getReportById,
	listReportsByReporterUserId,
	updateReportStatus,
} = require('../repositories/report.repository');
const {
	validateCreateReportPayload,
	validateUpdateReportStatusPayload,
} = require('../validators/report.validator');
const {success, failure} = require('../utils/response.util');
const eventService = require('./event.service');

async function createUserReportEntry(targetUserId, payload = {}, authUserId = '') {
	const normalizedTargetId = typeof targetUserId === 'string' ? targetUserId.trim() : '';
	if (!normalizedTargetId) {
		return failure(400, 'target user id is required.');
	}

	const validation = validateCreateReportPayload(payload);
	if (!validation.valid) {
		return failure(400, 'reason is required.');
	}

	const reporterUserId = typeof authUserId === 'string' ? authUserId.trim() : '';
	if (!reporterUserId) {
		return failure(401, 'User is not authenticated.');
	}

	const targetUser = await getPublicUserById(normalizedTargetId);
	if (!targetUser) {
		return failure(404, 'Target user not found.');
	}

	const report = await createReport({
		targetType: 'user',
		targetId: normalizedTargetId,
		reporterUserId,
		reason: validation.value.reason,
		details: validation.value.details,
	});

	Promise.resolve(eventService.notifyReportCreated(report)).catch(() => {});
	return success(201, report);
}

async function createMessageReportEntry(messageId, payload = {}, authUserId = '') {
	const normalizedMessageId = typeof messageId === 'string' ? messageId.trim() : '';
	if (!normalizedMessageId) {
		return failure(400, 'target message id is required.');
	}

	const validation = validateCreateReportPayload(payload);
	if (!validation.valid) {
		return failure(400, 'reason is required.');
	}

	const reporterUserId = typeof authUserId === 'string' ? authUserId.trim() : '';
	if (!reporterUserId) {
		return failure(401, 'User is not authenticated.');
	}

	const targetMessage = await getMessageById(normalizedMessageId);
	if (!targetMessage) {
		return failure(404, 'Target message not found.');
	}

	const report = await createReport({
		targetType: 'message',
		targetId: normalizedMessageId,
		reporterUserId,
		reason: validation.value.reason,
		details: validation.value.details,
	});

	Promise.resolve(eventService.notifyReportCreated(report)).catch(() => {});
	return success(201, report);
}

async function listReportsForReporter(payload = {}) {
	const reporterUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
	if (!reporterUserId) {
		return failure(401, 'User is not authenticated.');
	}

	const reports = await listReportsByReporterUserId(reporterUserId);
	return success(200, reports);
}

async function updateReportStatusEntry(reportId, payload = {}) {
	const normalizedReportId = typeof reportId === 'string' ? reportId.trim() : '';
	if (!normalizedReportId) {
		return failure(400, 'report id is required.');
	}

	const validation = validateUpdateReportStatusPayload(payload);
	if (!validation.valid) {
		return failure(400, 'status is required.');
	}

	const existingReport = await getReportById(normalizedReportId);
	if (!existingReport) {
		return failure(404, 'Report not found.');
	}

	const updated = await updateReportStatus(normalizedReportId, validation.value.status);
	Promise.resolve(eventService.notifyReportUpdated(updated)).catch(() => {});
	return success(200, updated);
}

module.exports = {
	createUserReportEntry,
	createMessageReportEntry,
	listReportsForReporter,
	updateReportStatusEntry,
};
