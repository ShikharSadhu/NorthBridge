function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeGeoPoint(point) {
	if (!point || typeof point !== 'object' || Array.isArray(point)) {
		return undefined;
	}

	const lat = typeof point.lat === 'number' ? point.lat : undefined;
	const lng = typeof point.lng === 'number' ? point.lng : undefined;
	if (typeof lat !== 'number' || Number.isNaN(lat) || typeof lng !== 'number' || Number.isNaN(lng)) {
		return undefined;
	}

	return {
		lat,
		lng,
	};
}

function toTaskRecord(task) {
	if (!task || typeof task !== 'object') {
		return null;
	}

	const acceptedByUserId = normalizeString(task.acceptedByUserId) || undefined;
	const acceptedAt = normalizeString(task.acceptedAt) || undefined;
	const pendingAcceptanceByUserId = normalizeString(task.pendingAcceptanceByUserId) || undefined;
	const pendingAcceptanceAt = normalizeString(task.pendingAcceptanceAt) || undefined;
	const completionRequestedByUserId = normalizeString(task.completionRequestedByUserId) || undefined;
	const completionRequestedAt = normalizeString(task.completionRequestedAt) || undefined;
	const completedByUserId = normalizeString(task.completedByUserId) || undefined;
	const completedAt = normalizeString(task.completedAt) || undefined;
	const ratedAt = normalizeString(task.ratedAt) || undefined;
	const isActive = typeof task.isActive === 'boolean' ? task.isActive : true;
	const isRatingPending = typeof task.isRatingPending === 'boolean' ? task.isRatingPending : false;
	const completionRating = typeof task.completionRating === 'number' ? task.completionRating : undefined;

	return {
		id: normalizeString(task.id),
		postedByUserId: normalizeString(task.postedByUserId),
		postedByName: normalizeString(task.postedByName),
		title: normalizeString(task.title),
		description: normalizeString(task.description),
		location: normalizeString(task.location),
		price: typeof task.price === 'number' ? task.price : 0,
		distanceKm: typeof task.distanceKm === 'number' ? task.distanceKm : 0,
		locationGeo: normalizeGeoPoint(task.locationGeo),
		scheduledAt: normalizeString(task.scheduledAt),
		executionMode: normalizeString(task.executionMode) || 'offline',
		isActive,
		completionRequestedByUserId,
		completionRequestedAt,
		completedByUserId,
		completedAt,
		isRatingPending,
		completionRating,
		ratedAt,
		acceptedByUserId,
		acceptedAt,
		pendingAcceptanceByUserId,
		pendingAcceptanceAt,
		status: normalizeString(task.status) || (acceptedByUserId ? 'accepted' : 'open'),
	};
}

function isValidTaskRecord(task) {
	return Boolean(
		task &&
			typeof task.id === 'string' &&
			typeof task.postedByUserId === 'string' &&
			typeof task.postedByName === 'string' &&
			typeof task.title === 'string' &&
			typeof task.description === 'string' &&
			typeof task.location === 'string' &&
			typeof task.price === 'number' &&
			typeof task.distanceKm === 'number' &&
			(typeof task.locationGeo === 'undefined' ||
				(task.locationGeo &&
					typeof task.locationGeo.lat === 'number' &&
					typeof task.locationGeo.lng === 'number')) &&
				typeof task.scheduledAt === 'string' &&
				typeof task.executionMode === 'string' &&
				typeof task.isActive === 'boolean' &&
				typeof task.isRatingPending === 'boolean',
	);
}

module.exports = {
	normalizeString,
	normalizeGeoPoint,
	toTaskRecord,
	isValidTaskRecord,
};
