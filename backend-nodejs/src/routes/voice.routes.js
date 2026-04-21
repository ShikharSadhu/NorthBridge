const {
	parseVoiceTaskController,
	createVoiceTaskController,
} = require('../controllers/voice.controller');

const voiceRoutes = [
	{
		method: 'POST',
		path: '/v1/voice',
		execute: (_params, body, userId) =>
			createVoiceTaskController(
				{
					text: typeof body.text === 'string' ? body.text : undefined,
				},
				{
					uid: userId,
					name: typeof body.authName === 'string' ? body.authName : undefined,
				},
			),
	},
	{
		method: 'POST',
		path: '/v1/voice/parse-task',
		execute: (_params, body) =>
			parseVoiceTaskController({
				transcript: typeof body.transcript === 'string' ? body.transcript : undefined,
			}),
	},
];

module.exports = {
	voiceRoutes,
};
