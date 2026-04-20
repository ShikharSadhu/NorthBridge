const {
	reportUserController,
	reportMessageController,
	listMyReportsController,
	updateReportStatusController,
} = require('../controllers/report.controller');

const reportRoutes = [
	{
		method: 'POST',
		path: '/v1/reports/users/:userId',
		execute: (params, body, userId) =>
			reportUserController(
				params.userId,
				{
					reason: typeof body.reason === 'string' ? body.reason : undefined,
					details: typeof body.details === 'string' ? body.details : undefined,
				},
				userId,
			),
	},
	{
		method: 'POST',
		path: '/v1/reports/messages/:messageId',
		execute: (params, body, userId) =>
			reportMessageController(
				params.messageId,
				{
					reason: typeof body.reason === 'string' ? body.reason : undefined,
					details: typeof body.details === 'string' ? body.details : undefined,
				},
				userId,
			),
	},
	{
		method: 'GET',
		path: '/v1/reports',
		execute: (_params, body, userId) =>
			listMyReportsController({
				userId,
			}),
	},
	{
		method: 'PATCH',
		path: '/v1/reports/:reportId',
		execute: (params, body) =>
			updateReportStatusController(params.reportId, {
				status: typeof body.status === 'string' ? body.status : undefined,
			}),
	},
];

module.exports = {
	reportRoutes,
};
