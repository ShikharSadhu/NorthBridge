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

function validateCreateReportPayload(payload = {}) {
	const value = {
		reason: normalizeString(payload.reason),
		details: normalizeString(payload.details) || undefined,
	};

	const errors = [];
	if (!value.reason) {
		errors.push({field: 'reason', message: 'reason is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateUpdateReportStatusPayload(payload = {}) {
	const status = normalizeString(payload.status).toLowerCase();
	const errors = [];

	if (!status) {
		errors.push({field: 'status', message: 'status is required.'});
	} else if (!['open', 'reviewing', 'resolved'].includes(status)) {
		errors.push({field: 'status', message: 'status must be open, reviewing, or resolved.'});
	}

	return createValidationResult(errors.length === 0, {status}, errors);
}

module.exports = {
	normalizeString,
	createValidationResult,
	validateCreateReportPayload,
	validateUpdateReportStatusPayload,
};
