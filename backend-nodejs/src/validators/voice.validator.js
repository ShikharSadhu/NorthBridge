function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function createValidationResult(valid, value, errors) {
	return {
		valid,
		value,
		errors,
	};
}

function validateVoiceTaskPayload(payload = {}) {
	const transcript = normalizeString(payload.transcript);
	const errors = [];

	if (!transcript) {
		errors.push({field: 'transcript', message: 'Transcript is required.'});
	}

	return createValidationResult(errors.length === 0, {transcript}, errors);
}

function validateVoiceTextPayload(payload = {}) {
	const text = normalizeString(payload.text);
	const errors = [];

	if (!text) {
		errors.push({field: 'text', message: 'Text is required.'});
	}

	return createValidationResult(errors.length === 0, {text}, errors);
}

module.exports = {
	normalizeString,
	createValidationResult,
	validateVoiceTaskPayload,
	validateVoiceTextPayload,
};
