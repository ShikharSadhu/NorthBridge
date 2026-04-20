const {validateVoiceTaskPayload} = require('../validators/voice.validator');
const {toVoiceTaskDraft} = require('../models/voice-task-draft.model');
const {success, failure} = require('../utils/response.util');

function parseVoiceTaskDraft(transcript) {
	const cleaned = typeof transcript === 'string' ? transcript.trim() : '';
	const words = cleaned.split(/\s+/).filter(Boolean);
	const priceMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
	const locationMatch = cleaned.match(/(?:in|at)\s+([A-Za-z0-9\s,]+)/i);
	const hasOnline = /\bonline\b|ऑनलाइन/i.test(cleaned);
	const hasOffline = /\boffline\b|ऑफलाइन/i.test(cleaned);
	const executionMode = hasOffline ? 'offline' : hasOnline ? 'online' : 'offline';

	return toVoiceTaskDraft({
		title: words.slice(0, 6).join(' ') || 'Voice task',
		description: cleaned || 'Task details from voice input.',
		location: locationMatch?.[1]?.trim() || (executionMode === 'online' ? 'Online' : 'Add location'),
		price: priceMatch ? Number(priceMatch[1]) : 0,
		scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		executionMode,
	});
}

function parseVoiceTask(payload = {}) {
	const validation = validateVoiceTaskPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Transcript is required.');
	}

	return success(200, parseVoiceTaskDraft(validation.value.transcript));
}

module.exports = {
	parseVoiceTask,
	parseVoiceTaskDraft,
};
