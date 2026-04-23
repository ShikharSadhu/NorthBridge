function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toPaymentRequestRecord(record) {
	if (!record || typeof record !== 'object') {
		return null;
	}

	return {
		id: normalizeString(record.id),
		chatId: normalizeString(record.chatId),
		taskId: normalizeString(record.taskId),
		requesterUserId: normalizeString(record.requesterUserId),
		receiverUserId: normalizeString(record.receiverUserId),
		amount: typeof record.amount === 'number' ? record.amount : 0,
		note: normalizeString(record.note),
		status: normalizeString(record.status) || 'pending',
		createdAt: normalizeString(record.createdAt),
		updatedAt: normalizeString(record.updatedAt),
		resolvedAt: normalizeString(record.resolvedAt) || undefined,
	};
}

module.exports = {
	normalizeString,
	toPaymentRequestRecord,
};
