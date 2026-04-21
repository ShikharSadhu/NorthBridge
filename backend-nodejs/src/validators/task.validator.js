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
	const rawLocationGeo =
		payload.locationGeo && typeof payload.locationGeo === 'object' && !Array.isArray(payload.locationGeo)
			? payload.locationGeo
			: null;
	const locationGeo = rawLocationGeo
		? {
				lat: typeof rawLocationGeo.lat === 'number' ? rawLocationGeo.lat : undefined,
				lng: typeof rawLocationGeo.lng === 'number' ? rawLocationGeo.lng : undefined,
		  }
		: undefined;
	const value = {
		title: normalizeString(payload.title),
		description: normalizeString(payload.description),
		location: normalizeString(payload.location),
		price: payload.price,
		distanceKm: typeof payload.distanceKm === 'number' ? payload.distanceKm : 0,
		locationGeo,
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
	if (value.locationGeo) {
		if (
			typeof value.locationGeo.lat !== 'number' ||
			Number.isNaN(value.locationGeo.lat) ||
			value.locationGeo.lat < -90 ||
			value.locationGeo.lat > 90
		) {
			errors.push({field: 'locationGeo.lat', message: 'locationGeo.lat must be between -90 and 90.'});
		}
		if (
			typeof value.locationGeo.lng !== 'number' ||
			Number.isNaN(value.locationGeo.lng) ||
			value.locationGeo.lng < -180 ||
			value.locationGeo.lng > 180
		) {
			errors.push({field: 'locationGeo.lng', message: 'locationGeo.lng must be between -180 and 180.'});
		}
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

function parseNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return undefined;
}

function parsePositiveInt(value) {
	const parsed = parseNumber(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return undefined;
	}

	return parsed;
}

function validateTaskListPayload(payload = {}) {
	const allowedSortBy = new Set(['default', 'distance', 'closestDate', 'latestDate', 'online', 'offline']);
	const allowedExecutionMode = new Set(['online', 'offline']);
	const allowedStatus = new Set(['open', 'accepted', 'completed', 'cancelled']);

	const sortByRaw = normalizeString(payload.sortBy);
	const executionModeRaw = normalizeString(payload.executionMode).toLowerCase();
	const statusRaw = normalizeString(payload.status).toLowerCase();
	const minPrice = parseNumber(payload.minPrice);
	const maxPrice = parseNumber(payload.maxPrice);
	const page = parsePositiveInt(payload.page);
	const pageSize = parsePositiveInt(payload.pageSize);
	const acceptorLat = parseNumber(payload.acceptorLat);
	const acceptorLng = parseNumber(payload.acceptorLng);

	const value = {
		sortBy: sortByRaw || undefined,
		executionMode: executionModeRaw || undefined,
		status: statusRaw || undefined,
		minPrice,
		maxPrice,
		page,
		pageSize,
		acceptorLat,
		acceptorLng,
	};

	const errors = [];
	if (sortByRaw && !allowedSortBy.has(sortByRaw)) {
		errors.push({field: 'sortBy', message: 'sortBy is invalid.'});
	}
	if (executionModeRaw && !allowedExecutionMode.has(executionModeRaw)) {
		errors.push({field: 'executionMode', message: 'executionMode must be online or offline.'});
	}
	if (statusRaw && !allowedStatus.has(statusRaw)) {
		errors.push({field: 'status', message: 'status is invalid.'});
	}
	if (payload.minPrice !== undefined && minPrice === undefined) {
		errors.push({field: 'minPrice', message: 'minPrice must be numeric.'});
	}
	if (payload.maxPrice !== undefined && maxPrice === undefined) {
		errors.push({field: 'maxPrice', message: 'maxPrice must be numeric.'});
	}
	if (typeof minPrice === 'number' && typeof maxPrice === 'number' && minPrice > maxPrice) {
		errors.push({field: 'priceRange', message: 'minPrice cannot be greater than maxPrice.'});
	}
	if (payload.page !== undefined && page === undefined) {
		errors.push({field: 'page', message: 'page must be a positive integer.'});
	}
	if (payload.pageSize !== undefined && pageSize === undefined) {
		errors.push({field: 'pageSize', message: 'pageSize must be a positive integer.'});
	}
	if (payload.acceptorLat !== undefined) {
		if (
			typeof acceptorLat !== 'number' ||
			Number.isNaN(acceptorLat) ||
			acceptorLat < -90 ||
			acceptorLat > 90
		) {
			errors.push({field: 'acceptorLat', message: 'acceptorLat must be between -90 and 90.'});
		}
	}
	if (payload.acceptorLng !== undefined) {
		if (
			typeof acceptorLng !== 'number' ||
			Number.isNaN(acceptorLng) ||
			acceptorLng < -180 ||
			acceptorLng > 180
		) {
			errors.push({field: 'acceptorLng', message: 'acceptorLng must be between -180 and 180.'});
		}
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
	validateTaskListPayload,
};
