function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toVoiceTaskDraft(value) {
	if (!value || typeof value !== 'object') {
		return {
			title: '',
			description: '',
			location: '',
			price: 0,
			scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			executionMode: 'offline',
		};
	}

	return {
		title: normalizeString(value.title),
		description: normalizeString(value.description),
		location: normalizeString(value.location),
		price: typeof value.price === 'number' ? value.price : 0,
		scheduledAt:
			typeof value.scheduledAt === 'string' && value.scheduledAt.trim()
				? value.scheduledAt
				: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		executionMode:
			typeof value.executionMode === 'string' && value.executionMode.trim()
				? value.executionMode.trim().toLowerCase()
				: 'offline',
	};
}

function isValidVoiceTaskDraft(value) {
	return Boolean(
		value &&
			typeof value.title === 'string' &&
			typeof value.description === 'string' &&
			typeof value.location === 'string' &&
			typeof value.price === 'number' &&
			typeof value.scheduledAt === 'string' &&
			typeof value.executionMode === 'string',
	);
}

module.exports = {
	normalizeString,
	toVoiceTaskDraft,
	isValidVoiceTaskDraft,
};
