const {validateVoiceTextPayload} = require('../validators/voice.validator');
const {
	parseVoiceTask,
	extractTaskFields,
	buildFullTask,
} = require('../services/voice.service');

async function parseVoiceTaskController(payload = {}) {
	const result = await Promise.resolve(parseVoiceTask(payload));
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				draft: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			draft: result.data,
		},
	};
}

async function createVoiceTaskController(payload = {}, currentUser = {}) {
	const validation = validateVoiceTextPayload(payload);
	if (!validation.valid) {
		return {
			status: 400,
			body: {
				message: 'text is required.',
			},
		};
	}

	const uid = typeof currentUser.uid === 'string' ? currentUser.uid.trim() : '';
	if (!uid) {
		return {
			status: 401,
			body: {
				message: 'User is not authenticated.',
			},
		};
	}

	try {
		const userFields = await extractTaskFields(validation.value.text);
		const fullTask = buildFullTask(userFields, currentUser);
		return {
			status: 200,
			body: fullTask,
		};
	} catch (_error) {
		return {
			status: 500,
			body: {
				message: 'Failed to build voice task.',
			},
		};
	}
}

module.exports = {
	parseVoiceTaskController,
	createVoiceTaskController,
};
