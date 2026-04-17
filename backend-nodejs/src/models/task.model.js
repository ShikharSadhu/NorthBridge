function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toTaskRecord(task) {
	if (!task || typeof task !== 'object') {
		return null;
	}

	return {
		id: normalizeString(task.id),
		postedByUserId: normalizeString(task.postedByUserId),
		postedByName: normalizeString(task.postedByName),
		title: normalizeString(task.title),
		description: normalizeString(task.description),
		location: normalizeString(task.location),
		price: typeof task.price === 'number' ? task.price : 0,
		distanceKm: typeof task.distanceKm === 'number' ? task.distanceKm : 0,
		scheduledAt: normalizeString(task.scheduledAt),
		executionMode: normalizeString(task.executionMode) || 'offline',
		status: task.status === 'accepted' ? 'accepted' : 'open',
		acceptedByUserId: normalizeString(task.acceptedByUserId) || undefined,
		acceptedAt: normalizeString(task.acceptedAt) || undefined,
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
				typeof task.scheduledAt === 'string' &&
				typeof task.executionMode === 'string',
	);
}

module.exports = {
	normalizeString,
	toTaskRecord,
	isValidTaskRecord,
};
