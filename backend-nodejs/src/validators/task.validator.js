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

function validateCreateTaskPayload(payload = {}) {
	const executionMode = normalizeString(payload.executionMode).toLowerCase();
	const value = {
		title: normalizeString(payload.title),
		description: normalizeString(payload.description),
		location: normalizeString(payload.location),
		price: payload.price,
		distanceKm: typeof payload.distanceKm === 'number' ? payload.distanceKm : 0,
		scheduledAt: normalizeString(payload.scheduledAt),
		executionMode: executionMode || 'offline',
		postedByUserId: normalizeString(payload.postedByUserId) || 'u_1001',
		postedByName: normalizeString(payload.postedByName) || 'Aarav Sharma',
	};

	const errors = [];
	if (!value.title) {
		errors.push({field: 'title', message: 'Title is required.'});
	}
	if (!value.description) {
		errors.push({field: 'description', message: 'Description is required.'});
	}
	if (!value.location) {
		errors.push({field: 'location', message: 'Location is required.'});
	}
	if (typeof value.price !== 'number') {
		errors.push({field: 'price', message: 'Price must be a number.'});
	}
	if (!value.scheduledAt) {
		errors.push({field: 'scheduledAt', message: 'scheduledAt is required.'});
	}
	if (value.executionMode !== 'online' && value.executionMode !== 'offline') {
		errors.push({field: 'executionMode', message: 'executionMode must be online or offline.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateAcceptTaskPayload(payload = {}) {
	const value = {
		acceptedByUserId: normalizeString(payload.acceptedByUserId),
	};

	const errors = [];
	if (!value.acceptedByUserId) {
		errors.push({field: 'acceptedByUserId', message: 'acceptedByUserId is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateRequestTaskCompletionPayload(payload = {}) {
	const value = {
		helperUserId: normalizeString(payload.helperUserId),
	};

	const errors = [];
	if (!value.helperUserId) {
		errors.push({field: 'helperUserId', message: 'helperUserId is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateTaskOwnerPayload(payload = {}) {
	const value = {
		ownerUserId: normalizeString(payload.ownerUserId),
	};

	const errors = [];
	if (!value.ownerUserId) {
		errors.push({field: 'ownerUserId', message: 'ownerUserId is required.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

function validateSubmitTaskRatingPayload(payload = {}) {
	const ownerValidation = validateTaskOwnerPayload(payload);
	const value = {
		...ownerValidation.value,
		rating: payload.rating,
	};

	const errors = [...ownerValidation.errors];
	if (typeof value.rating !== 'number' || Number.isNaN(value.rating)) {
		errors.push({field: 'rating', message: 'rating must be a number.'});
	} else if (value.rating < 1 || value.rating > 5) {
		errors.push({field: 'rating', message: 'rating must be between 1 and 5.'});
	}

	return createValidationResult(errors.length === 0, value, errors);
}

module.exports = {
	normalizeString,
	createValidationResult,
	validateCreateTaskPayload,
	validateAcceptTaskPayload,
	validateRequestTaskCompletionPayload,
	validateTaskOwnerPayload,
	validateSubmitTaskRatingPayload,
};
