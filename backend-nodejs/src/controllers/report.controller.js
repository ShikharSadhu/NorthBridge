const reportService = require('../services/report.service');

async function reportUserController(targetUserId, payload = {}, authUserId = '') {
	const result = await reportService.createUserReportEntry(targetUserId, payload, authUserId);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				report: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			report: result.data,
		},
	};
}

async function reportMessageController(messageId, payload = {}, authUserId = '') {
	const result = await reportService.createMessageReportEntry(messageId, payload, authUserId);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				report: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			report: result.data,
		},
	};
}

async function listMyReportsController(payload = {}) {
	const result = await reportService.listReportsForReporter(payload);
	return {
		status: result.status,
		body: {
			reports: result.data,
			message: result.ok ? undefined : result.message,
		},
	};
}

async function updateReportStatusController(reportId, payload = {}) {
	const result = await reportService.updateReportStatusEntry(reportId, payload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				report: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			report: result.data,
		},
	};
}

module.exports = {
	reportUserController,
	reportMessageController,
	listMyReportsController,
	updateReportStatusController,
};
