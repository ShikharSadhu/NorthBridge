function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toReportRecord(value) {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const targetType = normalizeString(value.targetType).toLowerCase();
	return {
		id: normalizeString(value.id),
		targetType: targetType === 'message' ? 'message' : 'user',
		targetId: normalizeString(value.targetId),
		reporterUserId: normalizeString(value.reporterUserId),
		reason: normalizeString(value.reason),
		details: normalizeString(value.details) || undefined,
		status: normalizeString(value.status) || 'open',
		createdAt:
			typeof value.createdAt === 'string' && value.createdAt.trim()
				? value.createdAt.trim()
				: new Date().toISOString(),
		updatedAt:
			typeof value.updatedAt === 'string' && value.updatedAt.trim()
				? value.updatedAt.trim()
				: new Date().toISOString(),
	};
}

module.exports = {
	normalizeString,
	toReportRecord,
};
